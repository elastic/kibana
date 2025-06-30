/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { AggregateQuery } from '@kbn/es-query';
import { type Filter } from '@kbn/es-query';
import type { DataView, DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { HttpSetup, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataCascade, getESQLStatsQueryMeta } from '@kbn/document-data-cascader';
import type { DataTableRecord } from '@kbn/discover-utils';
import { EuiBadge, EuiDescriptionList, EuiText, EuiButtonIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAppStateSelector } from '../../../main/state_management/discover_app_state_container';
import type { DiscoverStateContainer } from '../../../main/state_management/discover_state';

export { getESQLStatsQueryMeta } from '@kbn/document-data-cascader';

const DEFAULT_FILTERS: Filter[] = [];

interface ESQLDataCascadeProps {
  initialData: DataTableRecord[];
  cascadeGroups: string[];
  dataView: DataView;
  defaultFilters?: Filter[];
  onGroupClose: () => void;
  stateContainer: DiscoverStateContainer;
  services: {
    notifications: NotificationsStart;
    dataViews?: DataViewsServicePublic;
    http: HttpSetup;
    data: DataPublicPluginStart;
  };
}

export const ESQLDataCascade = ({
  initialData,
  cascadeGroups,
  dataView,
  stateContainer,
  onGroupClose,
  defaultFilters = DEFAULT_FILTERS,
  services: { notifications, dataViews, http, data: dataService },
}: ESQLDataCascadeProps) => {
  const globalState = stateContainer.globalState.get();
  const globalFilters = globalState?.filters;
  const to = globalState?.time?.to;
  const from = globalState?.time?.from;
  //   const globalQuery = globalState?.query;
  const [query] = useAppStateSelector((state) => [state.query]);

  const queryMeta = useMemo(() => {
    return getESQLStatsQueryMeta((query as AggregateQuery).esql);
  }, [query]);

  const [aggregationsQuery, setAggregationsQuery] = useState<string | undefined>();

  //   const statsQueryMeta = useMemo(() => {
  //     return getESQLStatsQueryMeta(globalQuery?.query || globalQuery?.esql || '');
  //   }, [globalQuery]);

  //   const columns = useMemo(() => {
  //     if (
  //       !globalQuery ||
  //       (globalQuery as Query).language !== 'esql' ||
  //       (globalQuery as AggregateQuery).esql === undefined
  //     ) {
  //       return [];
  //     }

  //     const parsedQuery = (globalQuery as Query).query || (globalQuery as AggregateQuery).esql;

  //     return getESQLStatsGroupByColumnsFromQuery(parsedQuery);
  //   }, [globalQuery]);

  //   const filters = useMemo(() => {
  //     try {
  //       return [
  //         buildEsQuery(undefined, globalQuery != null ? [globalQuery] : [], [
  //           ...(globalFilters?.filter((f) => f.meta.disabled === false) ?? []),
  //           ...(defaultFilters ?? []),
  //           ...(parentGroupingFilter ?? []),
  //         ]),
  //       ];
  //     } catch (e) {
  //       return [];
  //     }
  //   }, [defaultFilters, globalFilters, globalQuery, parentGroupingFilter]);

  //   // Create a unique, but stable (across re-renders) value
  //   const uniqueValue = useMemo(() => `data-grouping-level-${uuidv4()}`, []);

  //   const { data: result, isLoading: isLoadingGroups } = useGetDataGroupAggregationsQuery<
  //     GroupingAggregation<T>
  //   >({
  //     data: dataService,
  //     aggregationsQuery,
  //     dataView,
  //     toasts: notifications.toasts,
  //     enabled: aggregationsQuery && !isNoneGroup([selectedGroup]),
  //   });

  //   const onCascadeGroupingChange = useCallback<
  //     NonNullable<ComponentProps<typeof DataCascade>['onCascadeGroupingChange']>
  //   >(
  //     (groupByColumn) => {
  //       return setAggregationsQuery(
  //         getDataGroupingQuery({
  //           additionalFilters: filters,
  //           from: from ?? '',
  //           selectedGroup: groupByColumn,
  //           pageIndex: 0,
  //           uniqueValue,
  //           pageSize: 500,
  //           to: to ?? '',
  //         })
  //       );
  //     },
  //     [filters, from, to, uniqueValue]
  //   );

  return (
    <div
      css={({ euiTheme }) => ({
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        padding: euiTheme.size.s,
      })}
    >
      <DataCascade<DataTableRecord>
        data={initialData}
        cascadeGroups={cascadeGroups}
        tableTitleSlot={({ rows }) => (
          <EuiText>
            {i18n.translate('discover.esql_data_cascade.toolbar.query_string', {
              defaultMessage: '{entitiesCount} {entitiesAlias} | {groupCount} groups',
              values: {
                entitiesCount: Infinity,
                groupCount: rows.length,
                entitiesAlias: 'documents',
              },
            })}
          </EuiText>
        )}
        rowHeaderTitleSlot={({ row }) => {
          return (
            <EuiText size="s">
              <h4>{row.original.flattened[cascadeGroups[row.depth]]}</h4>
            </EuiText>
          );
        }}
        rowHeaderMetaSlots={({ row }) =>
          queryMeta.appliedFunctions
            .map(({ identifier, operator }) => {
              // maybe use operator to determine what meta component to render
              return (
                <EuiText size="s" textAlign="right">
                  <p>
                    <FormattedMessage
                      id="discover.esql_data_cascade.grouping.function"
                      defaultMessage="{identifier} <badge>{identifierValue}</badge>"
                      values={{
                        identifier,
                        identifierValue: row.original.flattened[identifier] as string,
                        badge: (chunks) => <EuiBadge color="hollow">{chunks}</EuiBadge>,
                      }}
                    />
                  </p>
                </EuiText>
              );
            })
            .concat([<EuiButtonIcon iconType="expand" />])
        }
        leafContentSlot={({ data }) => {
          return (
            <EuiDescriptionList
              listItems={(data ?? []).map((datum) => ({
                title: datum.group,
                description: JSON.stringify(datum, null, 2),
              }))}
            />
          );
        }}
        onCascadeGroupingChange={() => {}}
        onCascadeNodeExpanded={() => {}}
        onCascadeLeafExpanded={() => {}}
      />
    </div>
  );
};
