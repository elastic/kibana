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
import { useDiscoverServices } from '../../../../../../hooks/use_discover_services';
import { getCustomCascadeGridBodyStyle } from './cascade_leaf_component.styles';
import type { ESQLDataGroupNode } from './types';

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
      'virtualizerController'
    > {
  cellData: DataTableRecord[];
  cellId: string;
  rowIndex: number;
}

interface CustomCascadeGridBodyProps
  extends EuiDataGridCustomBodyProps,
    Pick<ESQLDataCascadeLeafCellProps, 'virtualizerController'> {
  data: DataTableRecord[];
  isFullScreenMode?: boolean;
  cellId: string;
  rowIndex: number;
}

const EMPTY_SORT: SortOrder[] = [];

/**
 * A custom grid body implementation for the unified data table to be used in the cascade leaf cells
 * that allows for nested cascade virtualization that's compatible with the EUI Data Grid.
 */
export const CustomCascadeGridBodyMemoized = React.memo(function CustomCascadeGridBody({
  isFullScreenMode,
  data,
  virtualizerController,
  cellId,
  rowIndex,
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

  const { virtualizer, handle, isDetached } = useConnectedChildVirtualizer({
    controller: virtualizerController,
    cellId,
    rowIndex,
    // @ts-expect-error - required to allow the use of the visibleRows array
    rows: visibleRows,
    estimatedRowHeight: 65,
    overscan: 10,
    privateScrollElement: customGridBodyScrollContainerRef,
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
    virtualizerController,
    rowIndex,
    onUpdateDataGridDensity,
  }: ESQLDataCascadeLeafCellProps) => {
    const services = useDiscoverServices();
    const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>();
    const [cascadeDataGridDensityState, setCascadeDataGridDensityState] = useState<DataGridDensity>(
      dataGridDensityState ?? DataGridDensity.COMPACT
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
      [cellData.length]
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
          setCustomGridBodyProps={setCustomGridBodyProps}
          virtualizerController={virtualizerController}
          cellId={cellId}
          rowIndex={rowIndex}
          isFullScreenMode={isCellInFullScreenMode}
        />
      ),
      [virtualizerController, isCellInFullScreenMode, cellId, cellData, rowIndex]
    );

    return (
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
      />
    );
  }
);
