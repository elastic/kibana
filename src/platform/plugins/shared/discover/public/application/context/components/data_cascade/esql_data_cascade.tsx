/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  EuiText,
  EuiBadge,
  EuiButtonEmpty,
  EuiPanel,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextTruncate,
} from '@elastic/eui';
import { type AggregateQuery } from '@kbn/es-query';
import { type Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
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
import { FormattedMessage } from '@kbn/i18n-react';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { useScopedServices } from '../../../../components/scoped_services_provider/scoped_services_provider';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useAppStateSelector } from '../../../main/state_management/discover_app_state_container';
import type { DiscoverStateContainer } from '../../../main/state_management/discover_state';
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

interface ESQLDataCascadeProps {
  initialData: DataTableRecord[];
  cascadeGroups: string[];
  dataView: DataView;
  defaultFilters?: Filter[];
  onGroupClose: () => void;
  stateContainer: DiscoverStateContainer;
  viewModeToggle?: React.ReactElement;
}

interface ESQLDataCascadeLeafCellProps {
  cellData: DataTableRecord[];
  queryMeta: ESQLStatsQueryMeta;
  dataView: DataView;
}

const ESQLDataCascadeLeafCell = React.memo(
  ({ cellData, queryMeta, dataView }: ESQLDataCascadeLeafCellProps) => {
    const { data, uiSettings, theme, storage, toastNotifications, fieldFormats } =
      useDiscoverServices();
    const [visibleColumns, setVisibleColumns] = useState(
      queryMeta.groupByFields.map((group) => group.field)
    );
    const [sampleSize, setSampleSize] = useState(cellData.length);

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

    return (
      <EuiPanel paddingSize="s">
        <UnifiedDataTable
          showColumnTokens
          enableInTableSearch
          rows={cellData}
          dataView={dataView}
          loadingState={DataLoadingState.loaded}
          columns={visibleColumns}
          showTimeCol={false}
          onSetColumns={setVisibleColumns}
          sort={[]}
          sampleSizeState={sampleSize}
          services={{
            theme,
            data,
            uiSettings,
            toastNotifications,
            storage,
            fieldFormats,
          }}
          ariaLabelledBy="data-cascade-leaf-cell"
          isPaginationEnabled={false}
          renderCustomToolbar={renderCustomToolbarWithElements}
          onUpdateDataGridDensity={() => {
            /* No-op for now */
          }}
          onUpdateRowHeight={() => {
            /* No-op for now */
          }}
          onUpdateHeaderRowHeight={() => {
            /* No-op for now */
          }}
          onUpdateSampleSize={setSampleSize}
        />
      </EuiPanel>
    );
  }
);

export const ESQLDataCascade = ({
  initialData,
  cascadeGroups,
  dataView,
  stateContainer,
  onGroupClose,
  defaultFilters = DEFAULT_FILTERS,
  viewModeToggle,
}: ESQLDataCascadeProps) => {
  const globalState = stateContainer.globalState.get();
  const globalFilters = globalState?.filters;
  const globalTimeRange = globalState?.time;
  const { euiTheme } = useEuiTheme();
  const [query] = useAppStateSelector((state) => [state.query]);
  const { data, expressions } = useDiscoverServices();
  const { scopedProfilesManager } = useScopedServices();

  const queryMeta = useMemo(() => {
    return getESQLStatsQueryMeta((query as AggregateQuery).esql);
  }, [query]);

  const styles = useMemo(() => esqlCascadeStyles({ euiTheme }), [euiTheme]);

  type ESQLDataGroupNode = DataTableRecord['flattened'] & { id: string };

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
      <ESQLDataCascadeLeafCell dataView={dataView} cellData={cellData!} queryMeta={queryMeta} />
    ),
    [dataView, queryMeta]
  );

  return (
    <div css={styles.wrapper}>
      <DataCascade<ESQLDataGroupNode>
        size="s"
        data={initialData.map((datum) => ({
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
          rowHeaderActions={({ row }) => [
            <EuiButtonEmpty
              size="s"
              color="text"
              iconSide="right"
              iconType="arrowDown"
              flush="right"
            >
              <FormattedMessage
                id="discover.esql_data_cascade.row.action.take_action"
                defaultMessage="Take action"
              />
            </EuiButtonEmpty>,
          ]}
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
