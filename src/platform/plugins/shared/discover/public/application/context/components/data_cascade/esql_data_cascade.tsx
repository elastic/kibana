/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  useMemo,
  useCallback,
  useState,
  useRef,
  type ComponentProps,
  Fragment,
} from 'react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import {
  EuiText,
  EuiBadge,
  EuiPanel,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextTruncate,
  EuiContextMenu,
  EuiPopover,
  EuiSelectable,
  EuiWrappingPopover,
  EuiButtonEmpty,
} from '@elastic/eui';
import { type AggregateQuery } from '@kbn/es-query';
import { type Filter } from '@kbn/es-query';
import {
  DataCascade,
  DataCascadeRow,
  DataCascadeRowCell,
  type DataCascadeRowProps,
  type DataCascadeRowCellProps,
} from '@kbn/shared-ux-document-data-cascade';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  getRenderCustomToolbarWithElements,
  UnifiedDataTable,
  DataLoadingState,
  DataGridDensity,
} from '@kbn/unified-data-table';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { useScopedServices } from '../../../../components/scoped_services_provider/scoped_services_provider';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useAppStateSelector } from '../../../main/state_management/discover_app_state_container';
import {
  useCurrentTabSelector,
  internalStateActions,
  useInternalStateDispatch,
  useCurrentTabAction,
} from '../../../main/state_management/redux';
import { fetchEsql } from '../../../main/data_fetching/fetch_esql';
import {
  constructCascadeQuery,
  type CascadeQueryArgs,
  getESQLStatsQueryMeta,
  type ESQLStatsQueryMeta,
} from './util';
import { getPatternCellRenderer } from '../../../../context_awareness/profile_providers/common/patterns/pattern_cell_renderer';
import { esqlCascadeStyles } from './esql_data_cascade.styles';

export { getESQLStatsQueryMeta } from './util';

type UnifiedDataTableProps = ComponentProps<typeof UnifiedDataTable>;

interface ESQLDataCascadeProps extends Omit<UnifiedDataTableProps, 'ref'> {
  cascadeGroups: string[];
  defaultFilters?: Filter[];
  viewModeToggle?: React.ReactNode | null;
  // stateContainer: DiscoverStateContainer;
}

interface ESQLDataCascadeLeafCellProps
  extends Pick<
    UnifiedDataTableProps,
    | 'dataView'
    | 'showTimeCol'
    | 'showKeyboardShortcuts'
    | 'columns'
    | 'services'
    | 'renderDocumentView'
    | 'dataGridDensityState' // default state value from root
    | 'rowAdditionalLeadingControls'
  > {
  cellData: DataTableRecord[];
  cellId: string;
  queryMeta: ESQLStatsQueryMeta;
}

type ESQLDataGroupNode = DataTableRecord['flattened'] & { id: string };

const contextRowActions: NonNullable<EuiContextMenuPanelDescriptor['items']> = [
  {
    name: i18n.translate('discover.esql_data_cascade.row.action.copy_to_clipboard', {
      defaultMessage: 'Copy to clipboard',
    }),
    icon: 'copy',
    onClick(this: ESQLDataGroupNode) {},
  },
  {
    name: i18n.translate('discover.esql_data_cascade.row.action.filter_in', {
      defaultMessage: 'Filter in',
    }),
    icon: 'plusInCircle',
    onClick(this: ESQLDataGroupNode) {},
  },
  {
    name: i18n.translate('discover.esql_data_cascade.row.action.filter_out', {
      defaultMessage: 'Filter out',
    }),
    icon: 'minusInCircle',
    onClick(this: ESQLDataGroupNode) {},
  },
  {
    name: i18n.translate('discover.esql_data_cascade.row.action.view_docs', {
      defaultMessage: 'View docs in new tab',
    }),
    icon: 'popout',
    onClick(this: ESQLDataGroupNode) {
      // const discoverLink = services.locator.getRedirectUrl({
      //   query,
      //   timeRange: executeContext.timeRange,
      //   hideChart: false,
      // });
      // window.open(discoverLink, '_blank');
    },
  },
];

const ContextMenu = React.memo(
  ({
    row,
    contextActions,
  }: {
    row: ESQLDataGroupNode;
    contextActions: NonNullable<EuiContextMenuPanelDescriptor['items']>;
  }) => {
    const panels = useMemo<EuiContextMenuPanelDescriptor[]>(
      () => [
        {
          id: row.id,
          items: contextActions.map((action, index) => ({
            ...action,
            // onClick: action.onClick?.bind(row),
          })),
        },
      ],
      [row, contextActions]
    );

    return <EuiContextMenu initialPanelId={panels[0].id} panels={panels} />;
  }
);

const ESQLDataCascadeLeafCell = React.memo(
  ({
    cellData,
    cellId,
    queryMeta,
    dataGridDensityState,
    showTimeCol,
    dataView,
    services,
    columns,
    showKeyboardShortcuts,
    renderDocumentView,
  }: ESQLDataCascadeLeafCellProps) => {
    const [, setVisibleColumns] = useState(queryMeta.groupByFields.map((group) => group.field));
    const [sampleSize, setSampleSize] = useState(cellData.length);
    const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>();
    const [cascadeDataGridDensityState, setCascadeDataGridDensityState] = useState<DataGridDensity>(
      dataGridDensityState ?? DataGridDensity.COMPACT
    );

    const renderCustomToolbarWithElements = useMemo(
      () =>
        getRenderCustomToolbarWithElements({
          leftSide: (
            <React.Fragment>
              <EuiText size="xs">
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

    const derivedColumns = useMemo(() => [], []);

    return (
      <EuiPanel paddingSize="s">
        <UnifiedDataTable
          dataView={dataView}
          showTimeCol={showTimeCol}
          showKeyboardShortcuts={showKeyboardShortcuts}
          services={services}
          sort={[]}
          enableInTableSearch
          ariaLabelledBy="data-cascade-leaf-cell"
          consumer={`discover_esql_cascade_row_leaf_${cellId}`}
          rows={cellData}
          loadingState={DataLoadingState.loaded}
          columns={derivedColumns}
          onSetColumns={setVisibleColumns}
          sampleSizeState={sampleSize}
          renderCustomToolbar={renderCustomToolbarWithElements}
          onUpdateSampleSize={setSampleSize}
          expandedDoc={expandedDoc}
          setExpandedDoc={setExpandedDocFn}
          dataGridDensityState={cascadeDataGridDensityState}
          onUpdateDataGridDensity={setCascadeDataGridDensityState}
          renderDocumentView={renderDocumentView}
        />
      </EuiPanel>
    );
  }
);

export const ESQLDataCascade = React.memo(
  ({
    rows: initialData,
    cascadeGroups,
    dataView,
    viewModeToggle,
    ...props
  }: ESQLDataCascadeProps) => {
    const [query, defaultFilters] = useAppStateSelector((state) => [state.query, state.filters]);
    const globalState = useCurrentTabSelector((state) => state.globalState);
    const globalFilters = globalState?.filters;
    const globalTimeRange = globalState?.timeRange;
    const { euiTheme } = useEuiTheme();
    const { data, expressions } = useDiscoverServices();
    const { scopedProfilesManager } = useScopedServices();

    const popoverRef = useRef<HTMLButtonElement | null>(null);
    const [popoverRowData, setPopoverRowData] = useState<ESQLDataGroupNode | null>(null);

    const [cascadeSelectOpen, setCascadeSelectOpen] = useState(false);

    const layoutUiState = useCurrentTabSelector((state) => state.uiState.layout);
    const setLayoutUiState = useCurrentTabAction(internalStateActions.setLayoutUiState);
    const dispatch = useInternalStateDispatch();

    const disableCascadeSupport = useCallback(() => {
      dispatch(
        setLayoutUiState({
          layoutUiState: {
            ...layoutUiState,
            supportsCascade: false,
          },
        })
      );
    }, [dispatch, layoutUiState, setLayoutUiState]);

    const queryMeta = useMemo(() => {
      return getESQLStatsQueryMeta((query as AggregateQuery).esql);
    }, [query]);

    const styles = useMemo(() => esqlCascadeStyles({ euiTheme }), [euiTheme]);

    const fetchCascadeData = useCallback(
      async ({ nodeType, nodePath, nodePathMap }: Omit<CascadeQueryArgs, 'query'>) => {
        const newQuery = constructCascadeQuery({
          query: query as AggregateQuery,
          nodeType,
          nodePath,
          nodePathMap,
        });

        const inspectorAdapters = { requests: new RequestAdapter() };

        const { records } = await fetchEsql({
          query: newQuery,
          dataView,
          data,
          expressions,
          filters: [
            ...(globalFilters?.filter((f) => f.meta.disabled === false) ?? []),
            ...(defaultFilters ?? []),
          ],
          ...(globalTimeRange && {
            timeRange: {
              to: globalTimeRange.to,
              from: globalTimeRange.from,
            },
          }),
          scopedProfilesManager,
          inspectorAdapters,
        });

        return records;
      },
      [
        data,
        dataView,
        defaultFilters,
        expressions,
        globalFilters,
        globalTimeRange,
        query,
        scopedProfilesManager,
      ]
    );

    const onCascadeGroupNodeExpanded = useCallback<
      NonNullable<
        DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['onCascadeGroupNodeExpanded']
      >
    >(
      // @ts-expect-error - WIP to understand how data is structured
      ({ nodePath, nodePathMap }) => {
        return fetchCascadeData({
          nodePath,
          nodePathMap,
          nodeType: 'group',
        });
      },
      [fetchCascadeData]
    );

    const onCascadeLeafNodeExpanded = useCallback<
      NonNullable<
        DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>
      >['onCascadeLeafNodeExpanded']
    >(
      ({ nodePath, nodePathMap }) => {
        return fetchCascadeData({
          nodePath,
          nodePathMap,
          nodeType: 'leaf',
        });
      },
      [fetchCascadeData]
    );

    const cascadeLeafRowRenderer = useCallback<
      DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>['children']
    >(
      ({ data: cellData, cellId }) => (
        <ESQLDataCascadeLeafCell
          {...props}
          dataView={dataView}
          cellData={cellData!}
          queryMeta={queryMeta}
          cellId={cellId}
        />
      ),
      [dataView, props, queryMeta]
    );

    const renderRowActionPopover = useCallback(() => {
      return popoverRowData ? (
        <EuiWrappingPopover
          button={popoverRef.current!}
          isOpen={popoverRowData !== null}
          closePopover={() => setPopoverRowData(null)}
          panelPaddingSize="none"
        >
          <ContextMenu row={popoverRowData!} contextActions={contextRowActions} />
        </EuiWrappingPopover>
      ) : null;
    }, [popoverRowData, setPopoverRowData]);

    const rowContextActionClickHandler = useCallback(
      function showPopover(this: ESQLDataGroupNode, e: React.MouseEvent<HTMLButtonElement>) {
        popoverRef.current = e.currentTarget;
        setPopoverRowData(this);
      },
      [setPopoverRowData]
    );

    const customTableHeading = useCallback<
      NonNullable<ComponentProps<typeof DataCascade<ESQLDataGroupNode>>['customTableHeader']>
    >(
      ({ currentSelectedColumns, availableColumns, onSelectionChange }) => {
        return (
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem>{viewModeToggle}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                isOpen={cascadeSelectOpen}
                closePopover={() => setCascadeSelectOpen(false)}
                panelPaddingSize="none"
                button={
                  <EuiButtonEmpty
                    size="s"
                    iconType="inspect"
                    flush="both"
                    onClick={() => setCascadeSelectOpen(true)}
                  >
                    <FormattedMessage
                      id="discover.esql_data_cascade.change_grouping.button_label"
                      defaultMessage="Grouped by: {selectedGroup}"
                      values={{ selectedGroup: currentSelectedColumns[0] }}
                    />
                  </EuiButtonEmpty>
                }
              >
                <EuiSelectable
                  searchable={false}
                  listProps={{
                    isVirtualized: false,
                  }}
                  options={['none'].concat(availableColumns).map((field) => ({
                    label: field,
                    checked: currentSelectedColumns.includes(field) ? 'on' : undefined,
                  }))}
                  singleSelection="always"
                  onActiveOptionChange={(option) => {
                    if (option) {
                      if (option.label === 'none') {
                        disableCascadeSupport();
                      } else {
                        onSelectionChange([option.label]);
                      }
                    }

                    setCascadeSelectOpen(false);
                  }}
                >
                  {(list) => <div style={{ width: 300 }}>{list}</div>}
                </EuiSelectable>
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
      [cascadeSelectOpen, disableCascadeSupport, viewModeToggle]
    );

    const cascadeGroupData = useMemo(
      () =>
        (initialData ?? []).map((datum) => ({
          id: datum.id,
          ...datum.flattened,
        })),
      [initialData]
    );

    const onCascadeGroupingChange = useCallback(() => {
      /** no op */
    }, []);

    const rowActions = useCallback<
      NonNullable<
        ComponentProps<
          typeof DataCascadeRow<ESQLDataGroupNode, DataTableRecord>
        >['rowHeaderActions']
      >
    >(
      ({ row }) => {
        return [
          {
            iconType: 'boxesVertical',
            'aria-label': `${row.original.id}-row-actions`,
            'data-test-subj': 'dscCascadeRowContextActionButton',
            onClick: rowContextActionClickHandler.bind(row.original),
          },
        ];
      },
      [rowContextActionClickHandler]
    );

    const rowHeaderMeta = useCallback<
      NonNullable<
        ComponentProps<
          typeof DataCascadeRow<ESQLDataGroupNode, DataTableRecord>
        >['rowHeaderMetaSlots']
      >
    >(
      ({ row }) =>
        queryMeta.appliedFunctions.map(({ identifier, operator }) => {
          // maybe use operator to determine what meta component to render
          return (
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <FormattedMessage
                id="discover.esql_data_cascade.grouping.function"
                defaultMessage="<bold>{identifier}: </bold><badge>{identifierValue}</badge>"
                values={{
                  identifier,
                  identifierValue: Number.isFinite(Number(row.original[identifier]))
                    ? Math.round(Number(row.original[identifier])).toLocaleString()
                    : (row.original[identifier] as string),
                  bold: (chunks) => (
                    <EuiFlexItem grow={false}>
                      <EuiText size="s" textAlign="right">
                        <p>{chunks}</p>
                      </EuiText>
                    </EuiFlexItem>
                  ),
                  badge: (chunks) => (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">{chunks}</EuiBadge>
                    </EuiFlexItem>
                  ),
                }}
              />
            </EuiFlexGroup>
          );
        }),
      [queryMeta.appliedFunctions]
    );

    const rowHeaderTitle = useCallback<
      NonNullable<
        ComponentProps<
          typeof DataCascadeRow<ESQLDataGroupNode, DataTableRecord>
        >['rowHeaderTitleSlot']
      >
    >(
      ({ row, selectedCascadeGroups }) => {
        const type = queryMeta.groupByFields.find(
          (field) => field.field === selectedCascadeGroups[row.depth]
        )!.type;

        if (/categorize/i.test(type)) {
          return (
            <React.Fragment>
              {getPatternCellRenderer(
                // @ts-expect-error - necessary to match the data shape expectation
                { flattened: row.original },
                selectedCascadeGroups[row.depth],
                false,
                48
              )}
            </React.Fragment>
          );
        }

        return (
          <EuiText size="s">
            <EuiTextTruncate
              text={row.original[selectedCascadeGroups[row.depth]] as string}
              width={400}
            >
              {(truncatedText) => {
                return <h4>{truncatedText}</h4>;
              }}
            </EuiTextTruncate>
          </EuiText>
        );
      },
      [queryMeta.groupByFields]
    );

    return (
      <div css={styles.wrapper}>
        <Fragment>{renderRowActionPopover()}</Fragment>
        <DataCascade<ESQLDataGroupNode>
          size="s"
          overscan={15}
          data={cascadeGroupData}
          cascadeGroups={cascadeGroups}
          customTableHeader={customTableHeading}
          onCascadeGroupingChange={onCascadeGroupingChange}
        >
          <DataCascadeRow<ESQLDataGroupNode>
            rowHeaderTitleSlot={rowHeaderTitle}
            rowHeaderMetaSlots={rowHeaderMeta}
            rowHeaderActions={rowActions}
            onCascadeGroupNodeExpanded={onCascadeGroupNodeExpanded}
          >
            <DataCascadeRowCell onCascadeLeafNodeExpanded={onCascadeLeafNodeExpanded}>
              {cascadeLeafRowRenderer}
            </DataCascadeRowCell>
          </DataCascadeRow>
        </DataCascade>
      </div>
    );
  }
);
