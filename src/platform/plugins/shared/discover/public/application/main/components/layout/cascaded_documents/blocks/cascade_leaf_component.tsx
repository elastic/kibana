/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiPanel,
  EuiText,
  type EuiDataGridCustomBodyProps,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  getRenderCustomToolbarWithElements,
  UnifiedDataTable,
  DataLoadingState,
  DataGridDensity,
  type UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import type { CascadeRowCellNestedVirtualizationAnchorProps } from '@kbn/shared-ux-document-data-cascade';
import type { DataTableRecord } from '@kbn/discover-utils';
import { FormattedMessage } from '@kbn/i18n-react';

interface ESQLDataCascadeLeafCellProps
  extends Omit<
      UnifiedDataTableProps,
      | 'columns'
      | 'loadingState'
      | 'onSetColumns'
      | 'sampleSizeState'
      | 'onUpdateSampleSize'
      | 'onUpdateDataGridDensity'
      | 'expandedDoc'
      | 'setExpandedDoc'
    >,
    CascadeRowCellNestedVirtualizationAnchorProps<DataTableRecord> {
  cellData: DataTableRecord[];
  cellId: string;
}

interface CustomCascadeGridBodyProps
  extends EuiDataGridCustomBodyProps,
    Pick<
      CascadeRowCellNestedVirtualizationAnchorProps<DataTableRecord>,
      'getScrollElement' | 'getScrollMargin'
    > {
  isFullScreenMode?: boolean;
  initialOffset: () => number;
  data: DataTableRecord[];
}

const getCustomCascadeGridBodyStyle = (euiTheme: UseEuiTheme['euiTheme']) => ({
  wrapper: css({
    overflow: 'hidden',
    position: 'relative',
    height: '100%',
    '& .euiDataGridHeader': {
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    },
    '& .euiDataGridRow': {
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    },
    '.unifiedDataTableToolbar:has(+ .euiDataGrid__content &)': {
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    },
    '.unifiedDataTableToolbar:has(+ .euiDataGrid__content &) .unifiedDataTableToolbarControlGroup':
      {
        backgroundColor: euiTheme.colors.backgroundBasePlain,
      },
  }),
  headerRow: css({
    position: 'sticky',
    top: 0,
  }),
  virtualizerContainer: css({
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    position: 'relative',
    scrollbarWidth: 'thin',
  }),
  virtualizerInner: css({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    overflowAnchor: 'none',

    '& > .euiDataGridRow:last-child .euiDataGridRowCell:not(.euiDataGridFooterCell)': {
      borderBlockEnd: 'none',
    },
  }),
  displayFlex: css({ display: 'flex' }),
});

/**
 * A custom grid body implementation for the unified data table to be used in the cascade leaf cells
 * that allows for nested cascade virtualization that's compatible with the EUI Data Grid
 */
export const CustomCascadeGridBodyMemoized = React.memo(function CustomCascadeGridBody({
  isFullScreenMode,
  initialOffset,
  data,
  getScrollElement,
  getScrollMargin,
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

  const scrollMargin = useMemo(() => getScrollMargin(), [getScrollMargin]);

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
      // customCascadeGridScrollRef.current = $gridBody;
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
    overscan: 15,
    initialOffset,
    scrollMargin,
    getScrollElement: scrollElementGetter,
    useAnimationFrameWithResizeObserver: true,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div
      data-test-subj="discoverCascadeCustomDataGridBody"
      role="rowgroup"
      css={customCascadeGridBodyStyle.wrapper}
    >
      <div css={customCascadeGridBodyStyle.headerRow}>{headerRow}</div>
      <div
        ref={customGridBodyScrollContainerRef}
        css={customCascadeGridBodyStyle.virtualizerContainer}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
          }}
        >
          <div
            css={customCascadeGridBodyStyle.virtualizerInner}
            style={{
              transform: `translateY(${items[0]?.start - virtualizer.options.scrollMargin ?? 0}px)`,
            }}
          >
            {items.map((virtualRow) => (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="euiDataGridRow"
                css={customCascadeGridBodyStyle.displayFlex}
              >
                {visibleColumns.map((column, colIndex) => {
                  return (
                    <Cell
                      key={`${virtualRow.index}-${colIndex}`}
                      colIndex={colIndex}
                      rowIndex={virtualRow.index}
                      visibleRowIndex={virtualRow.index}
                      columnId={column.id}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <React.Fragment>{footerRow}</React.Fragment>
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
    services,
    showKeyboardShortcuts,
    renderDocumentView,
    externalCustomRenderers,
    getScrollElement,
    getScrollMargin,
    getScrollOffset,
  }: ESQLDataCascadeLeafCellProps) => {
    const [sampleSize, setSampleSize] = useState(cellData.length);
    const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>();
    const [cascadeDataGridDensityState, setCascadeDataGridDensityState] = useState<DataGridDensity>(
      dataGridDensityState ?? DataGridDensity.COMPACT
    );

    // TODO: Implement column selection logic,
    // probably requires a new selection component that will be used within the row
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

    const [isCellInFullScreenMode, setIsCellInFullScreenMode] = useState(false);

    const renderCustomToolbarWithElements = useMemo(
      () =>
        getRenderCustomToolbarWithElements({
          leftSide: (
            <React.Fragment>
              <EuiText size="s">
                <b>
                  <FormattedMessage
                    id="discover.esql_data_cascade.row.cell.toolbar.heading"
                    defaultMessage="{count, plural, =0 {no results} =1 {1 result} other {# results}}"
                    values={{ count: cellData.length }}
                  />
                </b>
              </EuiText>
            </React.Fragment>
          ),
        }),
      [cellData]
    );

    const setExpandedDocFn = useCallback(
      (...args: Parameters<NonNullable<UnifiedDataTableProps['setExpandedDoc']>>) =>
        setExpandedDoc(args[0]),
      [setExpandedDoc]
    );

    const renderCustomCascadeGridBodyCallback = useCallback(
      ({
        Cell,
        visibleColumns,
        visibleRowData,
        setCustomGridBodyProps,
        gridWidth,
        headerRow,
        footerRow,
      }: EuiDataGridCustomBodyProps) => (
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
        />
      ),
      [cellData, cellId, getScrollElement, getScrollMargin, getScrollOffset, isCellInFullScreenMode]
    );

    return (
      <EuiPanel paddingSize="none">
        <UnifiedDataTable
          dataView={dataView}
          showTimeCol={showTimeCol}
          showKeyboardShortcuts={showKeyboardShortcuts}
          services={services}
          sort={[]}
          isSortEnabled={false}
          enableInTableSearch
          ariaLabelledBy="data-cascade-leaf-cell"
          consumer={`discover_esql_cascade_row_leaf_${cellId}`}
          rows={cellData}
          loadingState={DataLoadingState.loaded}
          columns={selectedColumns}
          onSetColumns={setSelectedColumns}
          sampleSizeState={sampleSize}
          renderCustomToolbar={renderCustomToolbarWithElements}
          onUpdateSampleSize={setSampleSize}
          expandedDoc={expandedDoc}
          setExpandedDoc={setExpandedDocFn}
          dataGridDensityState={cascadeDataGridDensityState}
          onUpdateDataGridDensity={setCascadeDataGridDensityState}
          renderDocumentView={renderDocumentView}
          renderCustomGridBody={renderCustomCascadeGridBodyCallback}
          onFullScreenChange={setIsCellInFullScreenMode}
          externalCustomRenderers={externalCustomRenderers}
          paginationMode="infinite"
        />
      </EuiPanel>
    );
  }
);
