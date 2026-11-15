/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter, TimeRange } from '@kbn/es-query';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { IEsqlSearchParams, ISearchMethods } from '@kbn/search-types';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { buildEsQuery } from '@kbn/es-query';
import { getTime, getEsQueryConfig } from '@kbn/data-plugin/public';
import {
  MetricsExecutionContextAction,
  MetricsExecutionContextName,
} from './execution_context_enums';
import {
  EsqlResponseError,
  extractEsqlEmbeddedError,
} from '../../../../common/errors/esql_response_error';
import { esqlResultToPlainObjects } from './esql_result_to_plain_objects';
import { getMetricsExecutionContext } from './execution_context';

export interface ExecuteEsqlParams {
  esqlQuery: string;
  search: Pick<ISearchMethods, 'esql'>;
  signal?: AbortSignal;
  timeFieldName?: string;
  timeRange?: TimeRange;
  filters?: Filter[];
  variables?: ESQLControlVariable[];
  uiSettings: IUiSettingsClient;
  /**
   * Forwarded onto `executionContext.meta` so the server-side pipeline tags
   * the APM transaction with `kibana_meta_profile_id`, keeping request and
   * error telemetry filterable by the same profile.
   */
  profileId: string;
  /** Names the request in the APM `page` label. Defaults to the metrics info fetch. */
  executionContextName?: MetricsExecutionContextName;
}

export interface ExecuteEsqlResult<TDocument> {
  documents: TDocument[];
  rawResponse: ESQLSearchResponse;
  requestParams: { query: string; filter?: object };
}

/**
 * Executes an ES|QL query using the data plugin's search service.
 * Rejects when Elasticsearch returns a response body that contains an `error` object.
 */
export async function executeEsqlQuery<TDocument extends object = Record<string, unknown>>({
  esqlQuery,
  search,
  signal,
  timeFieldName,
  timeRange,
  filters = [],
  variables,
  uiSettings,
  profileId,
  executionContextName = MetricsExecutionContextName.METRICS_INFO,
}: ExecuteEsqlParams): Promise<ExecuteEsqlResult<TDocument>> {
  const esQueryConfig = getEsQueryConfig(uiSettings);
  const timeFilter =
    timeRange && timeFieldName
      ? getTime(undefined, timeRange, { fieldName: timeFieldName })
      : undefined;
  const filtersWithTime = [...(timeFilter ? [timeFilter] : []), ...filters];
  const filter =
    filtersWithTime.length > 0
      ? buildEsQuery(undefined, [], filtersWithTime, esQueryConfig)
      : undefined;

  const { rawResponse } = await search.esql(
    {
      query: esqlQuery,
      filter: filter as IEsqlSearchParams['filter'],
      kibanaQueryContext: { timeRange, esqlVariables: variables },
    },
    {
      abortSignal: signal,
      ...getMetricsExecutionContext(MetricsExecutionContextAction.FETCH, executionContextName, {
        profile_id: profileId,
      }),
    }
  );
  const embedded = extractEsqlEmbeddedError(rawResponse);
  if (embedded) {
    throw new EsqlResponseError(embedded.cause, { status: embedded.status });
  }

  return {
    documents: esqlResultToPlainObjects<TDocument>(rawResponse),
    rawResponse,
    requestParams: { query: esqlQuery, ...(filter ? { filter } : {}) },
  };
}
