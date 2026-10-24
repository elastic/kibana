/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { EuiText, type EuiDataGridCustomBodyProps, useEuiTheme } from '@elastic/eui';
import {
  getRenderCustomToolbarWithElements,
  UnifiedDataTable,
  DataLoadingState,
  DataGridDensity,
  type UnifiedDataTableProps,
  type UnifiedDataTableRenderCustomToolbar,
} from '@kbn/unified-data-table';
import {
  type DataCascadeRowCellProps,
  useConnectedChildVirtualizer,
} from '@kbn/shared-ux-document-data-cascade';
import type { DataTableRecord, SortOrder } from '@kbn/discover-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import useObservable from 'react-use/lib/useObservable';
import { createPortal } from 'react-dom';
import {
  createHtmlPortalNode,
  InPortal,
  OutPortal,
  type HtmlPortalNode,
} from 'react-reverse-portal';
import { useDiscoverServices } from '../../../../../../hooks/use_discover_services';
import {
  getCustomCascadeGridBodyStyle,
  cascadeToolbarPortalNodeTestSubjAttribute,
} from './cascade_leaf_component.styles';
import type { ESQLDataGroupNode } from './types';
import { useCascadedDocumentsContext } from '../cascaded_documents_provider';

interface ESQLDataCascadeLeafCellProps
  extends Pick<
      UnifiedDataTableProps,
      | 'dataGridDensityState'
      | 'showTimeCol'
      | 'dataView'
      | 'showKeyboardShortcuts'
      | 'externalCustomRenderers'
      | 'onUpdateDataGridDensity'
    >,
    Pick<
      Parameters<DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>['children']>[0],
      'virtualizerController' | 'nodePath' | 'nodePathMap' | 'stickyHeaderExtensionPoint'
    > {
  cellData: DataTableRecord[];
  cellId: string;
  rowIndex: number;
}

interface CascadeGridBodyContextValue
  extends Pick<ESQLDataCascadeLeafCellProps, 'virtualizerController'> {
  data: DataTableRecord[];
  isFullScreenMode?: boolean;
  cellId: string;
  rowIndex: number;
  /**
   * Reverse portal node that the data grid toolbar is rendered into. The grid body outputs it
   * alongside the column headers in the cascade row's persistent header host.
   */
  toolbarPortalNode: HtmlPortalNode;
  /**
   * Reverse portal node for the grid header row, so that relocating it into the cascade sticky header
   * reparents its DOM without remounting the EUI header cells.
   */
  headerPortalNode: HtmlPortalNode;
  /**
   * When set, the toolbar and header row are portaled into this element (the cascade row's
   * sticky header extension point) instead of being rendered in place.
   */
  stickyHeaderPortalTarget: HTMLDivElement | null;
  stickyEnabled: boolean;
  /**
   * Exposes scrolling of the custom virtualized body to the owning leaf cell, e.g. so that
   * in-table search can bring the active match into view.
   */
  scrollApiRef: React.Ref<CustomCascadeGridBodyScrollApi>;
}

const CascadeGridBodyContext = createContext<CascadeGridBodyContextValue | null>(null);

export interface CustomCascadeGridBodyScrollApi {
  scrollToRow: (rowIndex: number) => void;
}

const EMPTY_SORT: SortOrder[] = [];

/**
 * Row height used for rows that have not been measured yet, until the first rendered row has been sampled.
 */
const DEFAULT_ESTIMATED_ROW_HEIGHT = 65;

/**
 * A custom grid body implementation for the unified data table to be used in the cascade leaf cells
 * that allows for nested cascade virtualization that's compatible with the EUI Data Grid.
 */
export const CustomCascadeGridBodyMemoized = React.memo(function CustomCascadeGridBody({
  Cell,
  visibleColumns,
  visibleRowData,
  headerRow,
  footerRow,
}: EuiDataGridCustomBodyProps) {
  const context = useContext(CascadeGridBodyContext);
  if (!context) {
    throw new Error('CustomCascadeGridBody must be rendered within CascadeGridBodyContext');
  }
  const {
    isFullScreenMode,
    data,
    virtualizerController,
    cellId,
    rowIndex,
    toolbarPortalNode,
    headerPortalNode,
    stickyHeaderPortalTarget,
    stickyEnabled,
    scrollApiRef,
  } = context;

  const visibleRows = useMemo(
    () => data.slice(visibleRowData.startRow, visibleRowData.endRow),
    [data, visibleRowData.startRow, visibleRowData.endRow]
  );

  const customGridBodyScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const { euiTheme } = useEuiTheme();

  const customCascadeGridBodyStyle = useMemo(
    () => getCustomCascadeGridBodyStyle(euiTheme),
    [euiTheme]
  );

  // Rows are not measured individually, so the estimate positions every row. Leaf rows share one
  // fixed height, so one rendered row is observed and its height used for all of them. Observing
  // (rather than sampling once) keeps the estimate correct when the height changes, e.g. when the
  // density or the row height setting is adjusted.
  const [estimatedRowHeight, setEstimatedRowHeight] = useState(DEFAULT_ESTIMATED_ROW_HEIGHT);
  const rowResizeObserverRef = useRef<ResizeObserver | null>(null);
  const observedRowRef = useRef<HTMLElement | null>(null);

  const sampleRowHeight = useCallback((element: HTMLDivElement | null) => {
    if (!element || observedRowRef.current?.isConnected) {
      // nothing mounted, or a live row is already being observed
      return;
    }

    if (typeof ResizeObserver === 'undefined') {
      const height = element.offsetHeight;
      if (height > 0) {
        observedRowRef.current = element;
        setEstimatedRowHeight(height);
      }
      return;
    }

    if (!rowResizeObserverRef.current) {
      rowResizeObserverRef.current = new ResizeObserver((entries) => {
        const entry = entries[entries.length - 1];
        const height = entry?.borderBoxSize?.[0]?.blockSize ?? entry?.contentRect.height ?? 0;
        if (height > 0) {
          setEstimatedRowHeight(height);
        }
      });
    }

    if (observedRowRef.current) {
      rowResizeObserverRef.current.unobserve(observedRowRef.current);
    }
    observedRowRef.current = element;
    rowResizeObserverRef.current.observe(element);
  }, []);

  useEffect(() => () => rowResizeObserverRef.current?.disconnect(), []);

  // Geometry the child virtualizer needs to place rows relative to the shared scroll element: where
  // the grid body starts within the cascade row, and how much of the viewport's top is covered by the
  // sticky header while it is displayed.
  const [scrollGeometry, setScrollGeometry] = useState({
    bodyOffsetWithinRow: 0,
    stickyHeaderHeight: 0,
  });

  useLayoutEffect(() => {
    const bodyElement = customGridBodyScrollContainerRef.current;
    const rowElement = bodyElement?.closest<HTMLElement>('[role="row"]');
    const inlineHeader = stickyHeaderPortalTarget?.closest<HTMLElement>(
      '[data-test-subj="dataCascadeInlineStickyHeader"]'
    );

    const measureGeometry = () => {
      const bodyOffsetWithinRow =
        bodyElement && rowElement
          ? bodyElement.getBoundingClientRect().top - rowElement.getBoundingClientRect().top
          : 0;
      // Inline headers retain their full height in flow, independently of their current scroll position.
      const stickyHeaderHeight = stickyEnabled
        ? inlineHeader?.getBoundingClientRect().height ?? 0
        : 0;

      setScrollGeometry((previous) =>
        previous.bodyOffsetWithinRow === bodyOffsetWithinRow &&
        previous.stickyHeaderHeight === stickyHeaderHeight
          ? previous
          : { bodyOffsetWithinRow, stickyHeaderHeight }
      );
    };

    measureGeometry();
    if (inlineHeader && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measureGeometry);
      observer.observe(inlineHeader);
      return () => observer.disconnect();
    }
  }, [stickyHeaderPortalTarget, stickyEnabled]);

  const { virtualizer, handle, isDetached } = useConnectedChildVirtualizer({
    controller: virtualizerController,
    cellId,
    rowIndex,
    // @ts-expect-error - required to allow the use of the visibleRows array
    rows: visibleRows,
    estimatedRowHeight,
    overscan: 10,
    scrollMarginOffset: scrollGeometry.bodyOffsetWithinRow,
    scrollPaddingStart: scrollGeometry.stickyHeaderHeight,
    privateScrollElement: customGridBodyScrollContainerRef,
  });

  // The virtualizer caches row positions and does not invalidate them when the estimate changes, so
  // the cache is dropped explicitly whenever a new row height has been observed.
  useLayoutEffect(() => {
    virtualizer.measure();
  }, [virtualizer, estimatedRowHeight]);

  useLayoutEffect(() => {
    if (isFullScreenMode && !isDetached) {
      handle.detachScrollElement();
    } else if (!isFullScreenMode && isDetached) {
      handle.reattachScrollElement();
    }
  }, [isFullScreenMode, isDetached, handle]);

  useImperativeHandle(
    scrollApiRef,
    () => ({
      scrollToRow: (targetRowIndex) => {
        // 'auto' leaves rows that are already visible (between the sticky header and the bottom edge)
        // where they are, places rows above the viewport just below the sticky header, and rows below
        // it at the bottom edge, accounting for the inline header's pinned height
        virtualizer.scrollToIndex(targetRowIndex, { align: 'auto', behavior: 'auto' });
      },
    }),
    [virtualizer]
  );

  const items = virtualizer.getVirtualItems();

  const scrollMargin = isDetached ? 0 : virtualizer.measurementsCache[0]?.start ?? 0;
  const translateY = items.length > 0 ? items[0].start - scrollMargin : 0;

  return (
    <div
      data-test-subj="discoverCascadeCustomDataGridBody"
      role="rowgroup"
      css={customCascadeGridBodyStyle.wrapper}
    >
      <InPortal node={headerPortalNode}>{headerRow}</InPortal>
      {stickyHeaderPortalTarget ? (
        <>
          {createPortal(
            <>
              <OutPortal node={toolbarPortalNode} />
              <div
                data-test-subj="discoverCascadeCustomDataPortalledGridHeaderContainer"
                css={customCascadeGridBodyStyle.portalledGridHeaderContainer}
              >
                <OutPortal node={headerPortalNode} />
              </div>
            </>,
            stickyHeaderPortalTarget
          )}
        </>
      ) : (
        <OutPortal node={headerPortalNode} />
      )}
      <div
        ref={customGridBodyScrollContainerRef}
        css={customCascadeGridBodyStyle.virtualizerContainer}
      >
        <div style={{ height: virtualizer.getTotalSize() }}>
          <div
            css={customCascadeGridBodyStyle.virtualizerInner}
            style={{ transform: `translateY(${translateY}px)` }}
          >
            {items.map((virtualRow) => (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={sampleRowHeight}
                className="euiDataGridRow"
                css={customCascadeGridBodyStyle.displayFlex}
              >
                {visibleColumns.map((column, colIndex) => (
                  <Cell
                    key={`${virtualRow.index}-${colIndex}`}
                    colIndex={colIndex}
                    rowIndex={virtualRow.index}
                    visibleRowIndex={virtualRow.index}
                    columnId={column.id}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {footerRow}
    </div>
  );
});

export const ESQLDataCascadeLeafCell = React.memo(
  ({
    cellData,
    cellId,
    dataGridDensityState,
    showTimeCol,
    dataView,
    externalCustomRenderers,
    virtualizerController,
    rowIndex,
    onUpdateDataGridDensity,
    nodePath,
    nodePathMap,
    stickyHeaderExtensionPoint,
  }: ESQLDataCascadeLeafCellProps) => {
    const services = useDiscoverServices();
    const {
      cascadedLeafDataSource,
      expandedDoc$,
      expandedDocOwner$,
      getExpandedDocSetter,
      getRenderDocumentViewMetaSetter,
    } = useCascadedDocumentsContext();
    const expandedDoc = useObservable(expandedDoc$, expandedDoc$.getValue());
    const expandedDocOwner = useObservable(expandedDocOwner$, expandedDocOwner$.getValue());
    const setExpandedDoc = useMemo(
      () => getExpandedDocSetter(cellId, { nodePath, nodePathMap }),
      [cellId, getExpandedDocSetter, nodePath, nodePathMap]
    );
    const setRenderDocumentViewMeta = useMemo(
      () => getRenderDocumentViewMetaSetter(cellId),
      [cellId, getRenderDocumentViewMetaSetter]
    );

    const [cascadeDataGridDensityState, setCascadeDataGridDensityState] = useState<DataGridDensity>(
      dataGridDensityState ?? DataGridDensity.COMPACT
    );

    const { getDataGridUiStateMap, setDataGridUiState } = useCascadedDocumentsContext();

    const initialGridState = useMemo(
      () => getDataGridUiStateMap()?.[cellId],
      [cellId, getDataGridUiStateMap]
    );

    const onInitialStateChange = useCallback<
      NonNullable<UnifiedDataTableProps['onInitialStateChange']>
    >(
      (newInitialGridState) => {
        setDataGridUiState(cellId, newInitialGridState);
      },
      [cellId, setDataGridUiState]
    );

    // TODO: Implement column selection logic,
    // probably requires a new selection component that will be used within the row
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

    useEffect(() => {
      // propagate localized changes of the data grid density,
      // so that other rows can use the same density value
      onUpdateDataGridDensity?.(cascadeDataGridDensityState);
    }, [cascadeDataGridDensityState, onUpdateDataGridDensity]);

    const [isCellInFullScreenMode, setIsCellInFullScreenMode] = useState(false);

    // In full screen mode the grid is fixed-positioned above the cascade, so the sticky header
    // slot is not visible and the toolbar/header must stay in their default positions.
    const stickyHeaderPortalTarget = !isCellInFullScreenMode
      ? stickyHeaderExtensionPoint.extensionPointElement
      : null;

    const isToolbarInStickyHeader = stickyHeaderPortalTarget !== null;

    const headerPortalNode = useMemo(() => createHtmlPortalNode(), []);

    // The data grid toolbar is rendered by EuiDataGrid outside of the custom grid body. To move it
    // into the cascade sticky header without remounting it, it is rendered into a reverse portal
    // node; an `OutPortal` places it in the inline header, or inside the grid in fullscreen mode,
    // while its React subtree and state stay mounted.
    const toolbarPortalNode = useMemo(
      () =>
        createHtmlPortalNode({
          attributes: {
            ['data-test-subj']: cascadeToolbarPortalNodeTestSubjAttribute,
          },
        }),
      []
    );

    const renderToolbarWithElements = useMemo(
      () =>
        getRenderCustomToolbarWithElements({
          leftSide: (
            <EuiText size="s">
              <b>
                <FormattedMessage
                  id="discover.dataCascade.row.cell.toolbar.heading"
                  defaultMessage="{count, plural, =0 {no results} =1 {1 result} other {# results}}"
                  values={{ count: cellData.length }}
                />
              </b>
            </EuiText>
          ),
        }),
      [cellData.length]
    );

    const scrollApiRef = useRef<CustomCascadeGridBodyScrollApi | null>(null);

    const scrollToCell = useCallback<NonNullable<UnifiedDataTableProps['scrollToCell']>>(
      ({ rowIndex: matchRowIndex }) => {
        // the match row index maps directly onto `cellData`, since the leaf grid is not paginated
        scrollApiRef.current?.scrollToRow(matchRowIndex);
      },
      []
    );

    const renderCustomToolbar = useCallback<UnifiedDataTableRenderCustomToolbar>(
      (toolbarProps) => (
        <>
          <InPortal node={toolbarPortalNode}>{renderToolbarWithElements(toolbarProps)}</InPortal>
          {!isToolbarInStickyHeader && <OutPortal node={toolbarPortalNode} />}
        </>
      ),
      [toolbarPortalNode, renderToolbarWithElements, isToolbarInStickyHeader]
    );

    const gridBodyContext = useMemo<CascadeGridBodyContextValue>(
      () => ({
        data: cellData,
        virtualizerController,
        cellId,
        rowIndex,
        isFullScreenMode: isCellInFullScreenMode,
        toolbarPortalNode,
        headerPortalNode,
        stickyHeaderPortalTarget,
        stickyEnabled: stickyHeaderExtensionPoint.stickyEnabled,
        scrollApiRef,
      }),
      [
        cellData,
        virtualizerController,
        cellId,
        rowIndex,
        isCellInFullScreenMode,
        toolbarPortalNode,
        headerPortalNode,
        stickyHeaderPortalTarget,
        stickyHeaderExtensionPoint.stickyEnabled,
      ]
    );

    return (
      <CascadeGridBodyContext.Provider value={gridBodyContext}>
        <UnifiedDataTable
          dataView={dataView}
          showTimeCol={showTimeCol}
          services={services}
          sort={EMPTY_SORT}
          isSortEnabled={false}
          enableInTableSearch
          enableComparisonMode
          scrollToCell={scrollToCell}
          showKeyboardShortcuts={false}
          ariaLabelledBy="data-cascade-leaf-cell"
          rows={cellData}
          loadingState={DataLoadingState.loaded}
          columns={selectedColumns}
          dataSource={cascadedLeafDataSource}
          onSetColumns={setSelectedColumns}
          renderCustomToolbar={renderCustomToolbar}
          expandedDoc={expandedDocOwner === cellId ? expandedDoc : undefined}
          setExpandedDoc={setExpandedDoc}
          dataGridDensityState={cascadeDataGridDensityState}
          onUpdateDataGridDensity={setCascadeDataGridDensityState}
          renderDocumentView="external"
          setRenderDocumentViewMeta={setRenderDocumentViewMeta}
          renderCustomGridBody={CustomCascadeGridBodyMemoized}
          onFullScreenChange={setIsCellInFullScreenMode}
          externalCustomRenderers={externalCustomRenderers}
          paginationMode="infinite"
          sampleSizeState={cellData.length}
          initialState={initialGridState}
          onInitialStateChange={onInitialStateChange}
        />
      </CascadeGridBodyContext.Provider>
    );
  }
);
