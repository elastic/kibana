/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback, useState, type ComponentProps } from 'react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import {
  EuiText,
  EuiBadge,
  EuiPopover,
  EuiPanel,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextTruncate,
  EuiContextMenu,
  EuiButtonIcon,
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
} from '@kbn/unified-data-table';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { useScopedServices } from '../../../../components/scoped_services_provider/scoped_services_provider';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useAppStateSelector } from '../../../main/state_management/discover_app_state_container';
// import type { DiscoverStateContainer } from '../../../main/state_management/discover_state';
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

const DEFAULT_FILTERS: Filter[] = [];

interface ESQLDataCascadeProps extends ComponentProps<typeof UnifiedDataTable> {
  cascadeGroups: string[];
  defaultFilters?: Filter[];
  viewModeToggle?: React.ReactElement;
  // dataView: DataView;
  // stateContainer: DiscoverStateContainer;
}

interface ESQLDataCascadeLeafCellProps
  extends Pick<
    ComponentProps<typeof UnifiedDataTable>,
    | 'dataView'
    | 'showTimeCol'
    | 'showKeyboardShortcuts'
    | 'sort'
    | 'columns'
    | 'services'
    | 'renderDocumentView'
  > {
  cellData: DataTableRecord[];
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
    onClick(this: ESQLDataGroupNode) {},
  },
];

function ContextMenu({
  row,
  contextActions,
  openPopoverRowId,
  setOpenPopoverRowId,
}: {
  row: ESQLDataGroupNode;
  contextActions: NonNullable<EuiContextMenuPanelDescriptor['items']>;
  openPopoverRowId: string | null;
  setOpenPopoverRowId: (id: string | null) => void;
}) {
  const panels = useMemo<EuiContextMenuPanelDescriptor[]>(
    () => [
      {
        id: row.id,
        items: [
          ...contextActions.map((action, index) => ({
            ...action,
            onClick: action.onClick?.bind(row),
          })),
        ],
      },
    ],
    [row, contextActions]
  );

  return (
    <EuiPopover
      id={'contextMenuPopoverId'}
      button={
        <EuiButtonIcon
          size="s"
          color="text"
          iconType="boxesVertical"
          onClick={() => setOpenPopoverRowId(row.id)}
          aria-label="row context menu button"
        />
      }
      isOpen={openPopoverRowId === row.id}
      closePopover={() => setOpenPopoverRowId(null)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId={panels[0].id} panels={panels} />
    </EuiPopover>
  );
}

const ESQLDataCascadeLeafCell = React.memo(
  ({ cellData, queryMeta, ...props }: ESQLDataCascadeLeafCellProps) => {
    const [visibleColumns, setVisibleColumns] = useState(
      queryMeta.groupByFields.map((group) => group.field)
    );
    const [sampleSize, setSampleSize] = useState(cellData.length);
    const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>();

    // make columns to be timestamp and summary fields only for starters

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

    // console.log('props received:: %o \n', props);

    return (
      <EuiPanel paddingSize="s">
        <UnifiedDataTable
          {...props}
          ariaLabelledBy="data-cascade-leaf-cell"
          enableInTableSearch
          rows={cellData}
          loadingState={DataLoadingState.loaded}
          columns={[]} // only allow filter in to modify this
          onSetColumns={setVisibleColumns}
          sampleSizeState={sampleSize}
          renderCustomToolbar={renderCustomToolbarWithElements}
          onUpdateSampleSize={setSampleSize}
          expandedDoc={expandedDoc}
          setExpandedDoc={(doc) => setExpandedDoc(doc)}
        />
      </EuiPanel>
    );
  }
);

export const ESQLDataCascade = ({
  rows: initialData,
  cascadeGroups,
  dataView,
  // stateContainer,
  viewModeToggle,
  ...props
}: ESQLDataCascadeProps) => {
  const defaultFilters = /* stateContainer.appState.getState().filters || */ DEFAULT_FILTERS;
  const globalState = /* stateContainer.getCurrentTab().globalState*/ {};
  const globalFilters = globalState?.filters;
  const globalTimeRange = globalState?.timeRange;
  const { euiTheme } = useEuiTheme();
  const [query] = useAppStateSelector((state) => [state.query]);
  const { data, expressions } = useDiscoverServices();
  const { scopedProfilesManager } = useScopedServices();

  const [openPopoverRowId, setOpenPopoverRowId] = useState<string | null>(null);

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
    ({ data: cellData }) => (
      <ESQLDataCascadeLeafCell
        {...props}
        dataView={dataView}
        cellData={cellData!}
        queryMeta={queryMeta}
      />
    ),
    [dataView, props, queryMeta]
  );

  return (
    <div css={styles.wrapper}>
      <DataCascade<ESQLDataGroupNode>
        size="s"
        overscan={15}
        data={(initialData ?? []).map((datum) => ({
          id: datum.id,
          ...datum.flattened,
        }))}
        cascadeGroups={cascadeGroups}
        tableTitleSlot={() => <React.Fragment>{viewModeToggle}</React.Fragment>}
        onCascadeGroupingChange={() => {}}
      >
        <DataCascadeRow<ESQLDataGroupNode>
          rowHeaderTitleSlot={({ row }) => {
            const type = queryMeta.groupByFields.find(
              (field) => field.field === cascadeGroups[row.depth]
            )!.type;

            if (/categorize/i.test(type)) {
              return (
                <React.Fragment>
                  {getPatternCellRenderer(
                    // @ts-expect-error - necessary to match the data shape expectation
                    { flattened: row.original },
                    cascadeGroups[row.depth],
                    false,
                    48
                  )}
                </React.Fragment>
              );
            }

            return (
              <EuiText size="s">
                <EuiTextTruncate
                  text={row.original[cascadeGroups[row.depth]] as string}
                  width={400}
                >
                  {(truncatedText) => {
                    return <h4>{truncatedText}</h4>;
                  }}
                </EuiTextTruncate>
              </EuiText>
            );
          }}
          rowHeaderMetaSlots={({ row }) =>
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
            })
          }
          rowHeaderActions={({ row }) => {
            return [
              <ContextMenu
                key={`${row.id}-context-menu`}
                row={row.original as ESQLDataGroupNode}
                contextActions={contextRowActions}
                openPopoverRowId={openPopoverRowId}
                setOpenPopoverRowId={setOpenPopoverRowId}
              />,
            ];
          }}
          onCascadeGroupNodeExpanded={onCascadeGroupNodeExpanded}
        >
          <DataCascadeRowCell onCascadeLeafNodeExpanded={onCascadeLeafNodeExpanded}>
            {cascadeLeafRowRenderer}
          </DataCascadeRowCell>
        </DataCascadeRow>
      </DataCascade>
    </div>
  );
};
