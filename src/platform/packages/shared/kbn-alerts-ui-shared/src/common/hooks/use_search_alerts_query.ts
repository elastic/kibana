/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@tanstack/react-query';

import type { SetOptional } from 'type-fest';
import { searchAlerts, type SearchAlertsParams } from '../apis/search_alerts/search_alerts';
import { DEFAULT_ALERTS_PAGE_SIZE } from '../constants';
import { AlertsQueryContext } from '../contexts/alerts_query_context';

export type UseSearchAlertsQueryParams = SetOptional<
  Omit<SearchAlertsParams, 'signal'>,
  'query' | 'sort' | 'pageIndex' | 'pageSize'
>;

export const queryKeyPrefix = ['alerts', searchAlerts.name];

/**
 * Query alerts
 *
 * When testing components that depend on this hook, prefer mocking the {@link searchAlerts} function instead of the hook itself.
 * @external https://tanstack.com/query/v4/docs/framework/react/guides/testing
 */
export const useSearchAlertsQuery = ({ data, http, ...params }: UseSearchAlertsQueryParams) => {
  const {
    ruleTypeIds,
    consumers,
    fields,
    query = {
      bool: {},
    },
    sort = [
      {
        '@timestamp': 'desc',
      },
    ],
    runtimeMappings,
    pageIndex = 0,
    pageSize = DEFAULT_ALERTS_PAGE_SIZE,
    minScore,
    trackScores,
  } = params;
  return useQuery({
    queryKey: queryKeyPrefix.concat(JSON.stringify(params)),
    queryFn: async ({ signal }) => {
      const response = await http.get<{
        servers: Array<{ error: true } | { error: false; name: string }>;
      }>('/api/cck/status', {
        signal,
      });
      const servers = [
        '_local',
        ...response.servers
          .filter((server): server is { error: false; name: string } => !server.error)
          .map((server) => server.name),
      ];
      const allAlerts = await Promise.all(
        servers.map((server) =>
          searchAlerts({
            data,
            http,
            signal,
            ruleTypeIds,
            consumers,
            fields,
            query,
            sort,
            runtimeMappings,
            pageIndex,
            pageSize,
            minScore,
            trackScores,
            server,
          })
        )
      );

      return allAlerts.reduce(
        (acc, { alerts, oldAlertsData, ecsAlertsData, total }, index) => {
          acc.alerts.push(...alerts.map((alert) => ({ ...alert, server: servers[index] })));
          acc.oldAlertsData.push(...oldAlertsData);
          acc.ecsAlertsData.push(...ecsAlertsData);
          acc.total += total;
          return acc;
        },
        {
          alerts: [],
          oldAlertsData: [],
          ecsAlertsData: [],
          total: 0,
        }
      );
    },
    refetchOnWindowFocus: false,
    context: AlertsQueryContext,
    enabled: ruleTypeIds.length > 0,
    // To avoid flash of empty state with pagination, see https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries#better-paginated-queries-with-placeholderdata
    keepPreviousData: true,
    placeholderData: {
      total: -1,
      alerts: [],
      oldAlertsData: [],
      ecsAlertsData: [],
    },
  });
};
