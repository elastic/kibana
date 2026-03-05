/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { EuiPanel, EuiText, type EuiDataGridCustomBodyProps, useEuiTheme } from '@elastic/eui';
import {
  getRenderCustomToolbarWithElements,
  UnifiedDataTable,
  DataLoadingState,
  DataGridDensity,
  type UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import {
  type DataCascadeRowCellProps,
  useCascadeVirtualizer,
  type CascadeVirtualizerProps,
} from '@kbn/shared-ux-document-data-cascade';
import type { DataTableRecord, SortOrder } from '@kbn/discover-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import debounce from 'lodash/debounce';
import { useDiscoverServices } from '../../../../../../hooks/use_discover_services';
import { getCustomCascadeGridBodyStyle } from './cascade_leaf_component.styles';
import type { ESQLDataGroupNode } from './types';
import type { CascadedDocumentsDataGridUiState } from '../cascaded_documents_provider';
import { useCascadedDocumentsContext } from '../cascaded_documents_provider';

interface ESQLDataCascadeLeafCellProps
  extends Pick<
      UnifiedDataTableProps,
      | 'dataGridDensityState'
      | 'showTimeCol'
      | 'dataView'
      | 'showKeyboardShortcuts'
      | 'renderDocumentView'
      | 'externalCustomRenderers'
      | 'onUpdateDataGridDensity'
    >,
    Pick<
      Parameters<DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>['children']>[0],
      'getScrollElement' | 'getScrollMargin' | 'getScrollOffset'
    > {
  cellData: DataTableRecord[];
  cellId: string;
}

interface CustomCascadeGridBodyProps
  extends EuiDataGridCustomBodyProps,
    Pick<ESQLDataCascadeLeafCellProps, 'getScrollElement' | 'getScrollMargin'> {
  data: DataTableRecord[];
  isFullScreenMode?: boolean;
  initialOffset: () => number;
  initialVirtualizationMetadata:
    | CascadedDocumentsDataGridUiState['virtualizationMetadata']
    | undefined;
  propagateVirtualizationMetadata: (
    virtualizationMetadata: NonNullable<CascadedDocumentsDataGridUiState['virtualizationMetadata']>
  ) => void;
}

const EMPTY_SORT: SortOrder[] = [];

/**
 * A custom grid body implementation for the unified data table to be used in the cascade leaf cells
 * that allows for nested cascade virtualization that's compatible with the EUI Data Grid.
 *
 * Key optimizations:
 * - Disable propagation of size changes to the parent virtualizer
 * - Stable scroll margin captured once to prevent position jumps
 */
export const CustomCascadeGridBodyMemoized = React.memo(function CustomCascadeGridBody({
  isFullScreenMode,
  initialOffset,
  initialVirtualizationMetadata,
  data,
  getScrollElement,
  getScrollMargin,
  propagateVirtualizationMetadata,
  Cell,
  visibleColumns,
  visibleRowData,
  headerRow,
  footerRow,
}: CustomCascadeGridBodyProps) {
  const visibleRows = useMemo(
    () => data.slice(visibleRowData.startRow, visibleRowData.endRow),
    [data, visibleRowData.startRow, visibleRowData.endRow]
  );

  const virtualizerRef = useRef<ReturnType<typeof useCascadeVirtualizer> | null>(null);
  const initialVirtualizationMetadataRef = useRef(initialVirtualizationMetadata);
  const customGridBodyScrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { euiTheme } = useEuiTheme();

  const customCascadeGridBodyStyle = useMemo(
    () => getCustomCascadeGridBodyStyle(euiTheme),
    [euiTheme]
  );

  // create scroll element reference for custom nested virtualized grid
  const virtualizerScrollElementRef = useRef<Element | null>(getScrollElement());

  useLayoutEffect(() => {
    const defaultScrollElement = getScrollElement();

    if (
      isFullScreenMode &&
      customGridBodyScrollContainerRef.current &&
      !virtualizerScrollElementRef.current?.isSameNode(customGridBodyScrollContainerRef.current)
    ) {
      // assign the custom grid body element as scrollable element in full screen mode
      virtualizerScrollElementRef.current = customGridBodyScrollContainerRef.current;
    } else if (
      !isFullScreenMode &&
      !virtualizerScrollElementRef.current?.isSameNode(defaultScrollElement)
    ) {
      // when exiting full screen mode we ensure the scroll element is reset to the default scroll container
      virtualizerScrollElementRef.current = defaultScrollElement;
    }
  }, [getScrollElement, isFullScreenMode]);

  const scrollElementGetter = useCallback(() => virtualizerScrollElementRef.current, []);

  const onVirtualizerChange = useMemo(
    () =>
      debounce<NonNullable<CascadeVirtualizerProps<DataTableRecord>['onStateChange']>>(
        (instance, didRestoreScrollPositionRef) => {
          if (!didRestoreScrollPositionRef && initialVirtualizationMetadataRef.current) return;

          const index = instance.getVirtualItemForOffset(instance.scrollOffset!)?.index ?? null;
          if (index != null) {
            propagateVirtualizationMetadata({
              initialDisplayedItemIndex: index,
              scrollRect: instance.scrollRect!,
            });
          }
        },
        50
      ),
    [propagateVirtualizationMetadata]
  );

  virtualizerRef.current = useCascadeVirtualizer<DataTableRecord>({
    // @ts-expect-error -- it's fine to do this as long as we're not using the sticky group header functionality, see issue https://github.com/elastic/kibana/issues/255075
    rows: visibleRows,
    enableStickyGroupHeader: false,
    estimatedRowHeight: 60,
    overscan: 10, // use a larger overscan since we are expecting large number of rows to be rendered
    initialOffset,
    scrollMargin: getScrollMargin(),
    getScrollElement: scrollElementGetter,
    onStateChange: onVirtualizerChange,
    initialRect: initialVirtualizationMetadataRef.current?.scrollRect,
    initialAnchorItemIndex:
      initialVirtualizationMetadataRef.current?.initialDisplayedItemIndex ?? 0,
  });

  useEffect(
    () => () => {
      onVirtualizerChange.cancel();
    },
    [onVirtualizerChange]
  );

  const items = virtualizerRef.current?.getVirtualItems();

  // Calculate transform using current scroll margin (now reactive from parent)
  const translateY = items.length > 0 ? items[0].start - getScrollMargin() : 0;

  return (
    <div
      data-test-subj="discoverCascadeCustomDataGridBody"
      role="rowgroup"
      css={customCascadeGridBodyStyle.wrapper}
    >
      <>{headerRow}</>
      <div
        ref={customGridBodyScrollContainerRef}
        css={customCascadeGridBodyStyle.virtualizerContainer}
      >
        <div style={{ height: virtualizerRef.current?.getTotalSize() }}>
          <div
            css={customCascadeGridBodyStyle.virtualizerInner}
            style={{ transform: `translateY(${translateY}px)` }}
          >
            {items.map((virtualRow) => (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizerRef.current?.measureElement}
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
    showKeyboardShortcuts,
    externalCustomRenderers,
    renderDocumentView,
    getScrollElement,
    getScrollMargin,
    getScrollOffset,
    onUpdateDataGridDensity,
  }: ESQLDataCascadeLeafCellProps) => {
    const services = useDiscoverServices();
    const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>();
    const [cascadeDataGridDensityState, setCascadeDataGridDensityState] = useState<DataGridDensity>(
      dataGridDensityState ?? DataGridDensity.COMPACT
    );

    const { getDataGridUiStateMap, setDataGridUiState } = useCascadedDocumentsContext();

    const initialGridState = useMemo(() => {
      return getDataGridUiStateMap()?.[cellId];
    }, [cellId, getDataGridUiStateMap]);

    const initialVirtualizationMetadata = useRef<
      CascadedDocumentsDataGridUiState['virtualizationMetadata']
    >(
      initialGridState?.virtualizationMetadata ?? {
        initialDisplayedItemIndex: 0,
        scrollRect: { width: 0, height: 0 },
      }
    );

    const setInitialInViewVirtualItemIndex = useCallback(
      (meta: NonNullable<CascadedDocumentsDataGridUiState['virtualizationMetadata']>) => {
        initialVirtualizationMetadata.current = meta;
      },
      []
    );

    const onInitialStateChange = useCallback<
      NonNullable<UnifiedDataTableProps['onInitialStateChange']>
    >(
      (newInitialGridState) => {
        setDataGridUiState(cellId, {
          ...newInitialGridState,
          virtualizationMetadata: initialVirtualizationMetadata.current,
        });
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

    const setExpandedDocFn = useCallback(
      (...args: Parameters<NonNullable<UnifiedDataTableProps['setExpandedDoc']>>) =>
        setExpandedDoc(args[0]),
      [setExpandedDoc]
    );

    const renderCustomToolbarWithElements = useMemo(
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
      [cellData]
    );

    const renderCustomCascadeGridBodyCallback = useCallback<
      NonNullable<UnifiedDataTableProps['renderCustomGridBody']>
    >(
      ({
        Cell,
        visibleColumns,
        visibleRowData,
        setCustomGridBodyProps,
        gridWidth,
        headerRow,
        footerRow,
      }) => (
        <CustomCascadeGridBodyMemoized
          key={isCellInFullScreenMode ? `full-screen-${cellId}` : cellId}
          Cell={Cell}
          data={cellData}
          visibleColumns={visibleColumns}
          visibleRowData={visibleRowData}
          headerRow={headerRow}
          footerRow={footerRow}
          gridWidth={gridWidth}
          getScrollMargin={getScrollMargin}
          setCustomGridBodyProps={setCustomGridBodyProps}
          getScrollElement={getScrollElement}
          initialOffset={getScrollOffset}
          isFullScreenMode={isCellInFullScreenMode}
          propagateVirtualizationMetadata={setInitialInViewVirtualItemIndex}
          initialVirtualizationMetadata={initialGridState?.virtualizationMetadata}
        />
      ),
      [
        isCellInFullScreenMode,
        cellId,
        cellData,
        getScrollMargin,
        getScrollElement,
        getScrollOffset,
        setInitialInViewVirtualItemIndex,
        initialGridState?.virtualizationMetadata,
      ]
    );

    return (
      <EuiPanel paddingSize="none">
        <UnifiedDataTable
          isPlainRecord
          dataView={dataView}
          showTimeCol={showTimeCol}
          showKeyboardShortcuts={showKeyboardShortcuts}
          services={services}
          sort={EMPTY_SORT}
          isSortEnabled={false}
          enableInTableSearch
          ariaLabelledBy="data-cascade-leaf-cell"
          // TODO: I think this will pollute local storage
          consumer={`discover_esql_cascade_row_leaf_${cellId}`}
          rows={cellData}
          loadingState={DataLoadingState.loaded}
          columns={selectedColumns}
          onSetColumns={setSelectedColumns}
          renderCustomToolbar={renderCustomToolbarWithElements}
          expandedDoc={expandedDoc}
          setExpandedDoc={setExpandedDocFn}
          dataGridDensityState={cascadeDataGridDensityState}
          onUpdateDataGridDensity={setCascadeDataGridDensityState}
          renderDocumentView={renderDocumentView}
          renderCustomGridBody={renderCustomCascadeGridBodyCallback}
          onFullScreenChange={setIsCellInFullScreenMode}
          externalCustomRenderers={externalCustomRenderers}
          paginationMode="infinite"
          sampleSizeState={cellData.length}
          initialState={initialGridState}
          onInitialStateChange={onInitialStateChange}
        />
      </EuiPanel>
    );
  }
);
