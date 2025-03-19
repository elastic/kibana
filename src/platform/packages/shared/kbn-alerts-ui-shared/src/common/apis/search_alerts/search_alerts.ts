/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { catchError, filter, lastValueFrom, map, of } from 'rxjs';
import type {
  Alert,
  EsQuerySnapshot,
  LegacyField,
  RuleRegistrySearchRequest,
  RuleRegistrySearchResponse,
} from '@kbn/alerting-types';
import { set } from '@kbn/safer-lodash-set';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type {
  MappingRuntimeFields,
  QueryDslFieldAndFormat,
  QueryDslQueryContainer,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/types';

export interface SearchAlertsParams {
  // Dependencies
  /**
   * Kibana data plugin, used to perform the query
   */
  data: DataPublicPluginStart;
  /**
   * Abort signal used to cancel the request
   */
  signal?: AbortSignal;

  // Parameters
  /**
   * Array of rule type ids used area-based filtering
   */
  ruleTypeIds: string[];
  /**
   * Array of consumers used area-based filtering
   */
  consumers?: string[];
  /**
   * ES query to perform on the affected alert indices
   */
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  /**
   * The alert document fields to include in the response
   */
  fields?: QueryDslFieldAndFormat[];
  /**
   * Sort combinations to apply to the query
   */
  sort: SortCombinations[];
  /**
   * Runtime mappings to apply to the query
   */
  runtimeMappings?: MappingRuntimeFields;
  /**
   * The page index to fetch
   */
  pageIndex: number;
  /**
   * The page size to fetch
   */
  pageSize: number;
}

export interface SearchAlertsResult {
  alerts: Alert[];
  oldAlertsData: LegacyField[][];
  ecsAlertsData: unknown[];
  total: number;
  querySnapshot?: EsQuerySnapshot;
}

/**
 * Performs an ES search query to fetch alerts applying alerting RBAC and area-based filtering
 */
export const searchAlerts = ({
  data,
  signal,
  ruleTypeIds,
  consumers,
  fields,
  query,
  sort,
  runtimeMappings,
  pageIndex,
  pageSize,
}: SearchAlertsParams): Promise<SearchAlertsResult> =>
  lastValueFrom(
    data.search
      .search<RuleRegistrySearchRequest, RuleRegistrySearchResponse>(
        {
          ruleTypeIds,
          consumers,
          fields,
          query,
          pagination: { pageIndex, pageSize },
          sort,
          runtimeMappings,
        },
        {
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
          abortSignal: signal,
        }
      )
      .pipe(
        filter((response) => {
          return !response.isRunning;
        }),
        map((response) => {
          const { rawResponse } = response;
          const total = parseTotalHits(rawResponse);
          const alerts = parseAlerts(rawResponse);
          const { oldAlertsData, ecsAlertsData } = transformToLegacyFormat(alerts);

          return {
            alerts,
            oldAlertsData,
            ecsAlertsData,
            total,
            querySnapshot: {
              request: response?.inspect?.dsl ?? [],
              response: [JSON.stringify(rawResponse)] ?? [],
            },
          };
        }),
        catchError((error) => {
          data.search.showError(error);
          return of({
            alerts: [],
            oldAlertsData: [],
            ecsAlertsData: [],
            total: 0,
          });
        })
      )
  );

/**
 * Normalizes the total hits from the raw response
 */
const parseTotalHits = (rawResponse: RuleRegistrySearchResponse['rawResponse']) => {
  let total = 0;
  if (rawResponse.hits.total) {
    if (typeof rawResponse.hits.total === 'number') {
      total = rawResponse.hits.total;
    } else if (typeof rawResponse.hits.total === 'object') {
      total = rawResponse.hits.total?.value ?? 0;
    }
  }
  return total;
};

/**
 * Extracts the alerts from the raw response
 */
const parseAlerts = (rawResponse: RuleRegistrySearchResponse['rawResponse']) =>
  rawResponse.hits.hits.reduce<Alert[]>((acc, hit) => {
    if (hit.fields) {
      acc.push({
        ...hit.fields,
        _id: hit._id,
        _index: hit._index,
      } as Alert);
    }
    return acc;
  }, []);

/**
 * Transforms the alerts to legacy formats (will be removed)
 * @deprecated Will be removed in v8.16.0
 */
const transformToLegacyFormat = (alerts: Alert[]) =>
  alerts.reduce<{
    oldAlertsData: LegacyField[][];
    ecsAlertsData: unknown[];
  }>(
    (acc, alert) => {
      const itemOldData = Object.entries(alert).reduce<Array<{ field: string; value: string[] }>>(
        (oldData, [key, value]) => {
          oldData.push({ field: key, value: value as string[] });
          return oldData;
        },
        []
      );
      const ecsData = Object.entries(alert).reduce((ecs, [key, value]) => {
        set(ecs, key, value ?? []);
        return ecs;
      }, {});
      acc.oldAlertsData.push(itemOldData);
      acc.ecsAlertsData.push(ecsData);
      return acc;
    },
    { oldAlertsData: [], ecsAlertsData: [] }
  );
