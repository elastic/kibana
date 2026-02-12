/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { EuiPanel, EuiText, type EuiDataGridCustomBodyProps, useEuiTheme } from '@elastic/eui';
import { useVirtualizer } from '@tanstack/react-virtual';
import { throttle } from 'lodash';
import {
  getRenderCustomToolbarWithElements,
  UnifiedDataTable,
  DataLoadingState,
  DataGridDensity,
  type UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import type { DataCascadeRowCellProps } from '@kbn/shared-ux-document-data-cascade';
import type { DataTableRecord, SortOrder } from '@kbn/discover-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDiscoverServices } from '../../../../../../hooks/use_discover_services';
import { getCustomCascadeGridBodyStyle } from './cascade_leaf_component.styles';
import type { ESQLDataGroupNode } from './types';
import type { DataCascadeLeafUiState } from '../../../state_management/redux';

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
      'getScrollElement' | 'getScrollMargin' | 'getScrollOffset' | 'preventSizeChangePropagation'
    > {
  cellData: DataTableRecord[];
  cellId: string;
  leafUiState?: DataCascadeLeafUiState;
  onLeafUiStateChange?: (nextState: DataCascadeLeafUiState) => void;
}

interface CustomCascadeGridBodyProps
  extends EuiDataGridCustomBodyProps,
    Pick<
      ESQLDataCascadeLeafCellProps,
      'getScrollElement' | 'getScrollMargin' | 'preventSizeChangePropagation'
    > {
  data: DataTableRecord[];
  isFullScreenMode?: boolean;
  initialOffset: () => number;
  onScrollOffsetChange?: (scrollOffset: number) => void;
}

const EMPTY_SORT: SortOrder[] = [];

/**
 * A custom grid body implementation for the unified data table to be used in the cascade leaf cells
 * that allows for nested cascade virtualization that's compatible with the EUI Data Grid.
 *
 * Key optimizations:
 * - Fixed row heights prevent measurement-triggered recalculations
 * - Stable scroll margin captured once to prevent position jumps
 * - Total size calculated from fixed heights (count * ROW_HEIGHT) for stability
 */
export const CustomCascadeGridBodyMemoized = React.memo(function CustomCascadeGridBody({
  isFullScreenMode,
  initialOffset,
  data,
  getScrollElement,
  getScrollMargin,
  preventSizeChangePropagation,
  onScrollOffsetChange,
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
  const customGridBodyScrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { euiTheme } = useEuiTheme();

  const customCascadeGridBodyStyle = useMemo(
    () => getCustomCascadeGridBodyStyle(euiTheme),
    [euiTheme]
  );

  // create scroll element reference for custom nested virtualized grid
  const virtualizerScrollElementRef = useRef<Element | null>(getScrollElement());

  const scrollElementGetter = useCallback(() => virtualizerScrollElementRef.current, []);

  useEffect(() => {
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

  const virtualizer = useVirtualizer({
    count: visibleRows.length,
    estimateSize: () => 50,
    overscan: 10, // use a larger overscan since we are expecting large number of rows to be rendered
    initialOffset,
    scrollMargin: getScrollMargin(),
    getScrollElement: scrollElementGetter,
  });

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (isFullScreenMode) {
        onScrollOffsetChange?.(event.currentTarget.scrollTop);
      }
    },
    [isFullScreenMode, onScrollOffsetChange]
  );

  /**
   * Register/unregister this nested virtualizer with the parent based on fullscreen mode.
   * When registered (not fullscreen), the parent won't adjust scroll position when this row resizes.
   * When unregistered (fullscreen), scroll adjustments don't matter since we have our own scroll container.
   */
  useEffect(() => {
    let unregister: (() => void) | null = null;

    if (virtualizer.scrollElement?.isSameNode(scrollElementGetter())) {
      // Only register when using the parent's scroll element (not in fullscreen mode)
      unregister = preventSizeChangePropagation();
    }

    return () => unregister?.();
  }, [preventSizeChangePropagation, scrollElementGetter, virtualizer.scrollElement]);

  const items = virtualizer.getVirtualItems();

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
        onScroll={handleScroll}
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
                ref={virtualizer.measureElement}
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
    renderDocumentView,
    externalCustomRenderers,
    getScrollElement,
    getScrollMargin,
    getScrollOffset,
    preventSizeChangePropagation,
    onUpdateDataGridDensity,
    leafUiState,
    onLeafUiStateChange,
  }: ESQLDataCascadeLeafCellProps) => {
    const services = useDiscoverServices();
    const cascadeDataGridDensityState =
      leafUiState?.density ?? dataGridDensityState ?? DataGridDensity.COMPACT;

    // TODO: Implement column selection logic,
    // probably requires a new selection component that will be used within the row
    const selectedColumns = leafUiState?.selectedColumns ?? [];

    const isCellInFullScreenMode = leafUiState?.isFullScreen ?? false;

    const expandedDoc = useMemo(() => {
      if (!leafUiState?.expandedDocId) {
        return undefined;
      }

      return cellData.find((doc) => doc.id === leafUiState.expandedDocId);
    }, [cellData, leafUiState?.expandedDocId]);

    const handleFullScreenChange = useCallback(
      (nextIsFullScreen: boolean) => {
        onLeafUiStateChange?.({ isFullScreen: nextIsFullScreen });
      },
      [onLeafUiStateChange]
    );

    const setExpandedDocFn = useCallback(
      (...args: Parameters<NonNullable<UnifiedDataTableProps['setExpandedDoc']>>) =>
        onLeafUiStateChange?.({ expandedDocId: args[0]?.id }),
      [onLeafUiStateChange]
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

    const handleLeafScrollOffsetChange = useMemo(
      () =>
        throttle((scrollOffset: number) => {
          onLeafUiStateChange?.({ scrollOffset });
        }, 150),
      [onLeafUiStateChange]
    );

    useEffect(() => {
      return () => handleLeafScrollOffsetChange.cancel();
    }, [handleLeafScrollOffsetChange]);

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
          preventSizeChangePropagation={preventSizeChangePropagation}
          initialOffset={() =>
            isCellInFullScreenMode ? leafUiState?.scrollOffset ?? 0 : getScrollOffset()
          }
          isFullScreenMode={isCellInFullScreenMode}
          onScrollOffsetChange={handleLeafScrollOffsetChange}
        />
      ),
      [
        cellData,
        cellId,
        preventSizeChangePropagation,
        getScrollElement,
        getScrollMargin,
        getScrollOffset,
        isCellInFullScreenMode,
        handleLeafScrollOffsetChange,
        leafUiState?.scrollOffset,
      ]
    );

    const handleSetColumns = useCallback(
      (nextColumns: string[]) => {
        onLeafUiStateChange?.({ selectedColumns: nextColumns });
      },
      [onLeafUiStateChange]
    );

    const handleDensityChange = useCallback(
      (nextDensity: DataGridDensity) => {
        onUpdateDataGridDensity?.(nextDensity);
        onLeafUiStateChange?.({ density: nextDensity });
      },
      [onLeafUiStateChange, onUpdateDataGridDensity]
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
          consumer={`discover_esql_cascade_row_leaf_${cellId}`}
          rows={cellData}
          loadingState={DataLoadingState.loaded}
          columns={selectedColumns}
          onSetColumns={handleSetColumns}
          renderCustomToolbar={renderCustomToolbarWithElements}
          expandedDoc={expandedDoc}
          setExpandedDoc={setExpandedDocFn}
          dataGridDensityState={cascadeDataGridDensityState}
          onUpdateDataGridDensity={handleDensityChange}
          renderDocumentView={renderDocumentView}
          renderCustomGridBody={renderCustomCascadeGridBodyCallback}
          onFullScreenChange={handleFullScreenChange}
          externalCustomRenderers={externalCustomRenderers}
          paginationMode="infinite"
          sampleSizeState={cellData.length}
        />
      </EuiPanel>
    );
  }
);
