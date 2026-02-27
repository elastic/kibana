/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiToolTip,
  type EuiDataGridCustomBodyProps,
  useEuiTheme,
} from '@elastic/eui';
import {
  getRenderCustomToolbarWithElements,
  UnifiedDataTable,
  DataLoadingState,
  DataGridDensity,
  type UnifiedDataTableProps,
  SOURCE_COLUMN,
  SourceDocument,
} from '@kbn/unified-data-table';
import {
  type DataCascadeRowCellProps,
  useCascadeVirtualizer,
  type CascadeVirtualizerProps,
} from '@kbn/shared-ux-document-data-cascade';
import {
  type DataTableRecord,
  type SortOrder,
  getShouldShowFieldHandler,
  MAX_DOC_FIELDS_DISPLAYED,
  SHOW_MULTIFIELDS,
} from '@kbn/discover-utils';
import { constructCascadeQuery } from '@kbn/esql-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import debounce from 'lodash/debounce';
import { useDiscoverServices } from '../../../../../../hooks/use_discover_services';
import { getCustomCascadeGridBodyStyle } from './cascade_leaf_component.styles';
import type { ESQLDataGroupNode } from './types';
import type { CascadedDocumentsDataGridUiState } from '../cascaded_documents_provider';
import type { ExpandedDocStore } from '../cascaded_documents_provider';
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
  nodePath: string[];
  nodePathMap: Record<string, string>;
  expandedDocStore?: ExpandedDocStore;
  onExpandDoc?: (cellId: string, doc: DataTableRecord | undefined, rows: DataTableRecord[]) => void;
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
const LIGHTWEIGHT_SUMMARY_ROW_HEIGHT = 68;

const ExpandButtonLight = React.memo(function ExpandButtonLight({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean;
  onToggle: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const buttonLabel = i18n.translate('unifiedDataTable.grid.viewDoc', {
    defaultMessage: 'Toggle dialog with details',
  });

  return (
    <EuiToolTip
      content={buttonLabel}
      delay="long"
      anchorClassName="unifiedDataTable__rowControl"
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        size="xs"
        iconSize="s"
        aria-label={buttonLabel}
        data-test-subj="docTableExpandToggleColumn"
        onClick={onToggle}
        color={isExpanded ? 'primary' : 'text'}
        iconType={isExpanded ? 'minimize' : 'expand'}
        isSelected={isExpanded}
      />
    </EuiToolTip>
  );
});

const getLightweightTableStyles = (euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']) => ({
  wrapper: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    fontSize: euiTheme.font.scale.s * euiTheme.base,
  }),
  header: css({
    borderBottom: euiTheme.border.thin,
    padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
  }),
  rowsViewport: css({
    minHeight: 0,
  }),
  row: css({
    display: 'flex',
    borderBottom: euiTheme.border.thin,
    alignItems: 'stretch',
    overflow: 'hidden',
    '&:hover': {
      backgroundColor: euiTheme.colors.backgroundBaseHighlighted,
    },
  }),
  rowStriped: css({
    display: 'flex',
    borderBottom: euiTheme.border.thin,
    alignItems: 'stretch',
    overflow: 'hidden',
    backgroundColor: euiTheme.colors.backgroundBasePlain,
    '&:hover': {
      backgroundColor: euiTheme.colors.backgroundBaseHighlighted,
    },
  }),
  controlCell: css({
    width: 28,
    minWidth: 28,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: euiTheme.size.xs,
  }),
  summaryCell: css({
    minWidth: 0,
    flex: 1,
    padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
    fontFamily: euiTheme.font.familyCode,
    '.unifiedDataTable__descriptionList': {
      WebkitLineClamp: 3,
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      minHeight: '4.5em',
      maxHeight: '4.5em',
    },
  }),
});

const LightweightRowContent = React.memo(function LightweightRowContent({
  row,
  expandedDocStore,
  cellId,
  onToggleExpand,
  controlCellCss,
  summaryCellCss,
  children,
}: {
  row: DataTableRecord;
  expandedDocStore?: ExpandedDocStore;
  cellId: string;
  onToggleExpand?: (doc: DataTableRecord | undefined) => void;
  controlCellCss: ReturnType<typeof getLightweightTableStyles>['controlCell'];
  summaryCellCss: ReturnType<typeof getLightweightTableStyles>['summaryCell'];
  children: React.ReactNode;
}) {
  const subscribe = useCallback(
    (cb: () => void) => expandedDocStore?.subscribe(cellId, cb) ?? (() => {}),
    [expandedDocStore, cellId]
  );
  const getIsExpanded = useCallback(
    () => expandedDocStore?.getDoc(cellId)?.id === row.id,
    [expandedDocStore, cellId, row.id]
  );
  const isExpanded = useSyncExternalStore(subscribe, getIsExpanded);

  return (
    <>
      <div css={controlCellCss}>
        {onToggleExpand && (
          <ExpandButtonLight
            isExpanded={isExpanded}
            onToggle={(event) => {
              event.stopPropagation();
              onToggleExpand(isExpanded ? undefined : row);
            }}
          />
        )}
      </div>
      <div
        css={summaryCellCss}
        className={isExpanded ? 'unifiedDataTable__cell--expanded' : undefined}
      >
        {children}
      </div>
    </>
  );
});

const UnifiedDataTableLight = React.memo(function UnifiedDataTableLight({
  rows,
  dataView,
  isPlainRecord,
  services,
  expandedDocStore,
  cellId,
  onExpandDoc,
  dataGridDensityState,
  getScrollElement,
  getScrollMargin,
  getScrollOffset,
  initialVirtualizationMetadata,
  propagateVirtualizationMetadata,
  resultsCount,
  onOpenInDiscoverTab,
}: {
  rows: DataTableRecord[];
  dataView: NonNullable<UnifiedDataTableProps['dataView']>;
  isPlainRecord?: boolean;
  services: NonNullable<UnifiedDataTableProps['services']>;
  expandedDocStore?: ExpandedDocStore;
  cellId: string;
  onExpandDoc?: ESQLDataCascadeLeafCellProps['onExpandDoc'];
  dataGridDensityState: DataGridDensity;
  getScrollElement: () => Element | null;
  getScrollMargin: () => number;
  getScrollOffset: () => number;
  initialVirtualizationMetadata?: CascadedDocumentsDataGridUiState['virtualizationMetadata'];
  propagateVirtualizationMetadata?: (
    meta: NonNullable<CascadedDocumentsDataGridUiState['virtualizationMetadata']>
  ) => void;
  resultsCount: number;
  onOpenInDiscoverTab: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(() => getLightweightTableStyles(euiTheme), [euiTheme]);
  const maxDocFieldsDisplayed = services.uiSettings.get<number>(MAX_DOC_FIELDS_DISPLAYED);
  const showMultiFields = services.uiSettings.get<boolean>(SHOW_MULTIFIELDS);
  const isCompressed = dataGridDensityState === DataGridDensity.COMPACT;
  const [measuredRowHeight, setMeasuredRowHeight] = useState<number | undefined>(undefined);
  const hasMeasuredRef = useRef(false);

  const measureRowHeightOnce = useCallback((element: HTMLDivElement | null) => {
    if (!element || hasMeasuredRef.current) return;
    const height = Math.ceil(element.getBoundingClientRect().height);
    if (height > 0) {
      hasMeasuredRef.current = true;
      setMeasuredRowHeight(height);
    }
  }, []);

  const onToggleExpand = useMemo(() => {
    if (!onExpandDoc) return undefined;
    return (doc: DataTableRecord | undefined) => onExpandDoc(cellId, doc, rows);
  }, [onExpandDoc, cellId, rows]);

  const shouldShowFieldHandler = useMemo(() => {
    const dataViewFields = dataView.fields.getAll().map((field) => field.name);
    return getShouldShowFieldHandler(dataViewFields, dataView, showMultiFields);
  }, [dataView, showMultiFields]);

  const [stableScrollMargin] = useState(() => getScrollMargin());

  const virtualizer = useCascadeVirtualizer<DataTableRecord>({
    // @ts-expect-error -- sticky headers are not used in this table
    rows,
    enableStickyGroupHeader: false,
    estimatedRowHeight: measuredRowHeight ?? LIGHTWEIGHT_SUMMARY_ROW_HEIGHT,
    overscan: 10,
    initialOffset: getScrollOffset,
    scrollMargin: stableScrollMargin,
    getScrollElement,
    onStateChange: undefined,
    initialRect: initialVirtualizationMetadata?.scrollRect,
    initialAnchorItemIndex: initialVirtualizationMetadata?.initialDisplayedItemIndex ?? 0,
  });

  const items = virtualizer.getVirtualItems();
  const translateY = items.length > 0 ? items[0].start - stableScrollMargin : 0;

  const firstVisibleIndexRef = useRef(0);
  if (items.length > 0) {
    firstVisibleIndexRef.current = items[0].index;
  }
  const latestPropagateMetadata = useRef(propagateVirtualizationMetadata);
  latestPropagateMetadata.current = propagateVirtualizationMetadata;
  useEffect(
    () => () => {
      const propagate = latestPropagateMetadata.current;
      if (!propagate) return;
      const scrollEl = getScrollElement();
      propagate({
        initialDisplayedItemIndex: firstVisibleIndexRef.current,
        scrollRect: scrollEl
          ? { width: scrollEl.clientWidth, height: scrollEl.clientHeight }
          : { width: 0, height: 0 },
      });
    },
    [getScrollElement]
  );

  return (
    <div css={styles.wrapper} data-test-subj="discoverCascadeLightDataTable">
      <div css={styles.header}>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="s"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <b>
                <FormattedMessage
                  id="discover.dataCascade.row.cell.toolbar.heading"
                  defaultMessage="{count, plural, =0 {no results} =1 {1 result} other {# results}}"
                  values={{ count: resultsCount }}
                />
              </b>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="discoverApp"
              onClick={onOpenInDiscoverTab}
              data-test-subj="discoverCascadeLightOpenInDiscoverTabButton"
            >
              <FormattedMessage
                id="discover.dataCascade.lightTable.openInDiscoverTabButtonLabel"
                defaultMessage="Open in Discover tab"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <div css={styles.rowsViewport}>
        <div style={{ height: virtualizer.getTotalSize() }}>
          <div style={{ transform: `translateY(${translateY}px)` }}>
            {items.map((virtualRow) => {
              const row = rows[virtualRow.index];
              const isStriped = virtualRow.index % 2 === 1;

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={measureRowHeightOnce}
                  style={measuredRowHeight ? { height: measuredRowHeight } : undefined}
                  css={isStriped ? styles.rowStriped : styles.row}
                >
                  <LightweightRowContent
                    row={row}
                    expandedDocStore={expandedDocStore}
                    cellId={cellId}
                    onToggleExpand={onToggleExpand}
                    controlCellCss={styles.controlCell}
                    summaryCellCss={styles.summaryCell}
                  >
                    <SourceDocument
                      useTopLevelObjectColumns={false}
                      row={row}
                      columnId={SOURCE_COLUMN}
                      dataView={dataView}
                      shouldShowFieldHandler={shouldShowFieldHandler}
                      maxEntries={maxDocFieldsDisplayed}
                      isPlainRecord={isPlainRecord}
                      fieldFormats={services.fieldFormats}
                      isCompressed={isCompressed}
                    />
                  </LightweightRowContent>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

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

const CascadeDataGrid = React.memo(function CascadeDataGrid({
  expandedDocStore,
  cellId,
  setExpandedDoc,
  ...rest
}: Omit<UnifiedDataTableProps, 'expandedDoc'> & {
  expandedDocStore?: ExpandedDocStore;
  cellId: string;
  setExpandedDoc: (doc: DataTableRecord | undefined) => void;
}) {
  const subscribe = useCallback(
    (cb: () => void) => expandedDocStore?.subscribe(cellId, cb) ?? (() => {}),
    [expandedDocStore, cellId]
  );
  const getSnapshot = useCallback(
    () => expandedDocStore?.getDoc(cellId),
    [expandedDocStore, cellId]
  );
  const expandedDoc = useSyncExternalStore(subscribe, getSnapshot);

  return <UnifiedDataTable {...rest} expandedDoc={expandedDoc} setExpandedDoc={setExpandedDoc} />;
});

export const ESQLDataCascadeLeafCell = React.memo(
  ({
    cellData,
    cellId,
    nodePath,
    nodePathMap,
    dataGridDensityState,
    showTimeCol,
    dataView,
    showKeyboardShortcuts,
    externalCustomRenderers,
    renderDocumentView,
    expandedDocStore,
    onExpandDoc,
    getScrollElement,
    getScrollMargin,
    getScrollOffset,
    onUpdateDataGridDensity,
  }: ESQLDataCascadeLeafCellProps) => {
    const services = useDiscoverServices();

    const [cascadeDataGridDensityState, setCascadeDataGridDensityState] = useState<DataGridDensity>(
      dataGridDensityState ?? DataGridDensity.COMPACT
    );

    const { getDataGridUiStateMap, setDataGridUiState, openInNewTab, esqlQuery, esqlVariables } =
      useCascadedDocumentsContext();

    // Add "// @vanilla" to the ES|QL query to use the lightweight table, omit for EUI DataGrid
    const useLightweightTable = 'esql' in esqlQuery && esqlQuery.esql.includes('// @vanilla');

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

    const latestSetDataGridUiState = useRef(setDataGridUiState);
    latestSetDataGridUiState.current = setDataGridUiState;
    useEffect(
      () => () => {
        latestSetDataGridUiState.current(cellId, {
          virtualizationMetadata: initialVirtualizationMetadata.current,
        });
      },
      [cellId]
    );

    const [isCellInFullScreenMode, setIsCellInFullScreenMode] = useState(false);

    const setExpandedDocFn = useCallback(
      (doc: DataTableRecord | undefined) => {
        onExpandDoc?.(cellId, doc, cellData);
      },
      [cellId, cellData, onExpandDoc]
    );

    const openInDiscoverTab = useCallback(() => {
      const query = constructCascadeQuery({
        query: esqlQuery,
        dataView,
        esqlVariables,
        nodeType: 'leaf',
        nodePath,
        nodePathMap,
      });
      if (query) {
        openInNewTab({ appState: { query } });
      }
    }, [esqlQuery, dataView, esqlVariables, nodePath, nodePathMap, openInNewTab]);

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
        {useLightweightTable ? (
          <UnifiedDataTableLight
            rows={cellData}
            dataView={dataView}
            isPlainRecord
            services={services}
            expandedDocStore={expandedDocStore}
            cellId={cellId}
            onExpandDoc={onExpandDoc}
            dataGridDensityState={cascadeDataGridDensityState}
            getScrollElement={getScrollElement}
            getScrollMargin={getScrollMargin}
            getScrollOffset={getScrollOffset}
            initialVirtualizationMetadata={initialGridState?.virtualizationMetadata}
            propagateVirtualizationMetadata={setInitialInViewVirtualItemIndex}
            resultsCount={cellData.length}
            onOpenInDiscoverTab={openInDiscoverTab}
          />
        ) : (
          <CascadeDataGrid
            expandedDocStore={expandedDocStore}
            cellId={cellId}
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
        )}
      </EuiPanel>
    );
  }
);
