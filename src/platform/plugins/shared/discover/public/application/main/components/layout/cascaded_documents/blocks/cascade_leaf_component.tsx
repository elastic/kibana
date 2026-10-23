/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { EuiText, type EuiDataGridCustomBodyProps, useEuiTheme } from '@elastic/eui';
import {
  getRenderCustomToolbarWithElements,
  UnifiedDataTable,
  DataLoadingState,
  DataGridDensity,
  type UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import {
  type DataCascadeRowCellProps,
  useConnectedChildVirtualizer,
} from '@kbn/shared-ux-document-data-cascade';
import type { DataTableRecord, SortOrder } from '@kbn/discover-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import useObservable from 'react-use/lib/useObservable';
import { useDiscoverServices } from '../../../../../../hooks/use_discover_services';
import { getCustomCascadeGridBodyStyle } from './cascade_leaf_component.styles';
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
      'virtualizerController' | 'nodePath' | 'nodePathMap'
    > {
  cellData: DataTableRecord[];
  cellId: string;
  rowIndex: number;
}

interface CustomCascadeGridBodyProps
  extends EuiDataGridCustomBodyProps,
    Pick<ESQLDataCascadeLeafCellProps, 'virtualizerController'>,
    Pick<
      Parameters<typeof useConnectedChildVirtualizer>[0],
      'cellId' | 'rowIndex' | 'estimatedRowHeight' | 'persistScrollAnchor'
    > {
  isFullScreenMode?: boolean;
  'data-test-subj': string;
}

const EMPTY_SORT: SortOrder[] = [];
const DOCUMENT_ROW_ESTIMATED_HEIGHT = 65;
const COMPARISON_ROW_ESTIMATED_HEIGHT = 40;

/**
 * A custom grid body implementation for the unified data table to be used in the cascade leaf cells
 * that allows for nested cascade virtualization that's compatible with the EUI Data Grid.
 */
export const CustomCascadeGridBodyMemoized = React.memo(function CustomCascadeGridBody({
  isFullScreenMode,
  virtualizerController,
  cellId,
  rowIndex,
  estimatedRowHeight,
  persistScrollAnchor,
  'data-test-subj': dataTestSubj,
  Cell,
  visibleColumns,
  visibleRowData,
  headerRow,
  footerRow,
}: CustomCascadeGridBodyProps) {
  // the connected virtualizer only needs to know how many rows the grid renders
  const rowCount = visibleRowData.endRow - visibleRowData.startRow;
  const rows = useMemo(
    () => Array.from({ length: rowCount }, (_, index) => ({ id: String(index) })),
    [rowCount]
  );

  const customGridBodyScrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { euiTheme } = useEuiTheme();

  const customCascadeGridBodyStyle = useMemo(
    () => getCustomCascadeGridBodyStyle(euiTheme),
    [euiTheme]
  );

  const { virtualizer, handle, isDetached } = useConnectedChildVirtualizer({
    controller: virtualizerController,
    cellId,
    rowIndex,
    rows,
    estimatedRowHeight,
    overscan: 10,
    privateScrollElement: customGridBodyScrollContainerRef,
    persistScrollAnchor,
  });

  useLayoutEffect(() => {
    if (isFullScreenMode && !isDetached) {
      handle.detachScrollElement();
    } else if (!isFullScreenMode && isDetached) {
      handle.reattachScrollElement();
    }
  }, [isFullScreenMode, isDetached, handle]);

  const items = virtualizer.getVirtualItems();

  const scrollMargin = isDetached ? 0 : virtualizer.measurementsCache[0]?.start ?? 0;
  const translateY = items.length > 0 ? items[0].start - scrollMargin : 0;

  return (
    <div data-test-subj={dataTestSubj} role="rowgroup" css={customCascadeGridBodyStyle.wrapper}>
      <>{headerRow}</>
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
    externalCustomRenderers,
    virtualizerController,
    rowIndex,
    onUpdateDataGridDensity,
    nodePath,
    nodePathMap,
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
      [cellData.length]
    );

    const renderCustomCascadeGridBodyCallback = useCallback<
      NonNullable<UnifiedDataTableProps['renderCustomGridBody']>
    >(
      (gridBodyProps) => (
        <CustomCascadeGridBodyMemoized
          {...gridBodyProps}
          key={cellId}
          data-test-subj="discoverCascadeCustomDataGridBody"
          virtualizerController={virtualizerController}
          cellId={cellId}
          rowIndex={rowIndex}
          estimatedRowHeight={DOCUMENT_ROW_ESTIMATED_HEIGHT}
          isFullScreenMode={isCellInFullScreenMode}
        />
      ),
      [virtualizerController, isCellInFullScreenMode, cellId, rowIndex]
    );

    // The comparison grid's rows are the compared fields rather than documents, so it connects to the
    // cascade under its own id and, since it doesn't share the document grid's index space, without
    // persisting a scroll anchor
    const renderCustomComparisonGridBodyCallback = useCallback<
      NonNullable<UnifiedDataTableProps['renderCustomComparisonGridBody']>
    >(
      (gridBodyProps) => (
        <CustomCascadeGridBodyMemoized
          {...gridBodyProps}
          key={`${cellId}/comparison`}
          data-test-subj="discoverCascadeComparisonGridBody"
          virtualizerController={virtualizerController}
          cellId={`${cellId}/comparison`}
          rowIndex={rowIndex}
          estimatedRowHeight={COMPARISON_ROW_ESTIMATED_HEIGHT}
          persistScrollAnchor={false}
          isFullScreenMode={isCellInFullScreenMode}
        />
      ),
      [virtualizerController, isCellInFullScreenMode, cellId, rowIndex]
    );
    return (
      <UnifiedDataTable
        dataView={dataView}
        showTimeCol={showTimeCol}
        services={services}
        sort={EMPTY_SORT}
        isSortEnabled={false}
        enableComparisonMode
        enableInTableSearch={false}
        showKeyboardShortcuts={false}
        ariaLabelledBy="data-cascade-leaf-cell"
        rows={cellData}
        loadingState={DataLoadingState.loaded}
        columns={selectedColumns}
        dataSource={cascadedLeafDataSource}
        onSetColumns={setSelectedColumns}
        renderCustomToolbar={renderCustomToolbarWithElements}
        expandedDoc={expandedDocOwner === cellId ? expandedDoc : undefined}
        setExpandedDoc={setExpandedDoc}
        dataGridDensityState={cascadeDataGridDensityState}
        onUpdateDataGridDensity={setCascadeDataGridDensityState}
        renderDocumentView="external"
        setRenderDocumentViewMeta={setRenderDocumentViewMeta}
        renderCustomGridBody={renderCustomCascadeGridBodyCallback}
        renderCustomComparisonGridBody={renderCustomComparisonGridBodyCallback}
        onFullScreenChange={setIsCellInFullScreenMode}
        externalCustomRenderers={externalCustomRenderers}
        paginationMode="infinite"
        sampleSizeState={cellData.length}
        initialState={initialGridState}
        onInitialStateChange={onInitialStateChange}
      />
    );
  }
);
