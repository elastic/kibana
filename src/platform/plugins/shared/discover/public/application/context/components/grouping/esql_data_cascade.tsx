/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback } from 'react';
import { lastValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { buildEsQuery, type AggregateQuery } from '@kbn/es-query';
import { type Filter } from '@kbn/es-query';
import type { DataView, DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { HttpSetup, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  DataCascade,
  DataCascadeRow,
  DataCascadeRowCell,
  type DataCascadeRowProps,
  type DataCascadeRowCellProps,
  getESQLStatsQueryMeta,
} from '@kbn/shared-ux-document-data-cascade';
import type { DataTableRecord } from '@kbn/discover-utils';
import { EuiBadge, EuiDescriptionList, EuiText, EuiButtonIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAppStateSelector } from '../../../main/state_management/discover_app_state_container';
import type { DiscoverStateContainer } from '../../../main/state_management/discover_state';
import { getDataGroupingQuery } from './query_builder';

export { getESQLStatsQueryMeta } from '@kbn/shared-ux-document-data-cascade';

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
  const globalQuery = globalState?.query;
  const [query] = useAppStateSelector((state) => [state.query]);

  const queryMeta = useMemo(() => {
    return getESQLStatsQueryMeta((query as AggregateQuery).esql);
  }, [query]);

  const filters = useMemo(() => {
    try {
      return [
        buildEsQuery(undefined, globalQuery != null ? [globalQuery] : [], [
          ...(globalFilters?.filter((f) => f.meta.disabled === false) ?? []),
          ...(defaultFilters ?? []),
          // ...(parentGroupingFilter ?? []),
        ]),
      ];
    } catch (e) {
      return [];
    }
  }, [defaultFilters, globalFilters, globalQuery]);

  type ESQLDataGroupNode = DataTableRecord['flattened'] & { id: string };

  const onCascadeGroupNodeExpanded = useCallback<
    NonNullable<
      DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['onCascadeGroupNodeExpanded']
    >
  >(
    // @ts-expect-error - WIP to understand how data is structured
    async ({ nodePath }) => {
      const aggregationsQuery = getDataGroupingQuery({
        additionalFilters: filters,
        from: from ?? '',
        selectedGroup: nodePath[nodePath.length - 1],
        pageIndex: 0,
        uniqueValue: `data-grouping-level-${nodePath.join('-')}`,
        pageSize: 500,
        to: to ?? '',
      });

      const searchResult = await lastValueFrom(
        dataService.search.search({
          params: {
            index: dataView.getIndexPattern(),
            size: 0,
            track_total_hits: true,
            body: {
              ...aggregationsQuery,
            },
          },
        })
      );

      // eslint-disable-next-line no-console -- WIP to understand how data is structured
      console.log({ searchResult });
    },
    [dataService.search, dataView, filters, from, to]
  );

  const onCascadeLeafNodeExpanded = useCallback<
    NonNullable<
      DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>
    >['onCascadeLeafNodeExpanded']
  >(
    async ({ nodePath, nodePathMap }) => {
      const searchResult = await lastValueFrom(
        dataService.search.search({
          params: {
            index: dataView.getIndexPattern(),
            size: 0,
            track_total_hits: true,
            body: {},
          },
        })
      );

      return [];
    },
    [dataService.search, dataView]
  );

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
      }}
    >
      <DataCascade<ESQLDataGroupNode>
        stickyGroupRoot
        data={initialData.map((datum) => ({
          id: datum.id,
          ...datum.flattened,
        }))}
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
        onCascadeGroupingChange={() => {}}
      >
        <DataCascadeRow<ESQLDataGroupNode>
          rowHeaderTitleSlot={({ row }) => {
            return (
              <EuiText size="s">
                <h4>{row.original[cascadeGroups[row.depth]] as string}</h4>
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
                          identifierValue: row.original[identifier] as string,
                          badge: (chunks) => <EuiBadge color="hollow">{chunks}</EuiBadge>,
                        }}
                      />
                    </p>
                  </EuiText>
                );
              })
              .concat([
                <EuiButtonIcon
                  aria-label={i18n.translate('discover.esql_data_cascade.grouping.expand', {
                    defaultMessage: 'Expand {groupValue} group',
                    values: {
                      groupValue: row.original[cascadeGroups[row.depth]] as string,
                    },
                  })}
                  iconType="expand"
                />,
              ])
          }
          onCascadeGroupNodeExpanded={onCascadeGroupNodeExpanded}
        >
          <DataCascadeRowCell onCascadeLeafNodeExpanded={onCascadeLeafNodeExpanded}>
            {({ data }) => {
              return (
                <EuiDescriptionList
                  listItems={(data ?? []).map((datum) => ({
                    title: datum.group,
                    description: JSON.stringify(datum, null, 2),
                  }))}
                />
              );
            }}
          </DataCascadeRowCell>
        </DataCascadeRow>
      </DataCascade>
    </div>
  );
};
