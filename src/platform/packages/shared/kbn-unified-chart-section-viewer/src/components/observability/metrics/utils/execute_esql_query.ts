/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter, TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { getESQLResults } from '@kbn/esql-utils';
import { buildEsQuery } from '@kbn/es-query';
import { getTime, getEsQueryConfig } from '@kbn/data-plugin/public';
import {
  MetricsExecutionContextAction,
  MetricsExecutionContextName,
} from './execution_context_enums';
import { esqlResultToPlainObjects } from './esql_result_to_plain_objects';
import { getMetricsExecutionContext } from './execution_context';

export interface ExecuteEsqlParams {
  esqlQuery: string;
  search: ISearchGeneric;
  signal?: AbortSignal;
  dataView: DataView;
  timeRange?: TimeRange;
  filters?: Filter[];
  variables?: ESQLControlVariable[];
  uiSettings: IUiSettingsClient;
}

export function getErrorMessageFromEsqlResponse(response: object): string | undefined {
  if (!('error' in response) || response.error == null || typeof response.error !== 'object') {
    return undefined;
  }
  const e = response.error as {
    type?: string;
    reason?: string;
    root_cause?: Array<{ type?: string; reason?: string }>;
  };
  const head = [e.type, e.reason].filter((x): x is string => Boolean(x?.trim())).join(': ');
  if (head) {
    return head;
  }
  const rc = e.root_cause?.[0];
  const fromRoot = [rc?.type, rc?.reason].filter((x): x is string => Boolean(x?.trim())).join(': ');
  return fromRoot || 'Elasticsearch returned an error';
}

/**
 * Executes an ES|QL query using the data plugin's search service.
 */
export async function executeEsqlQuery<TDocument extends object = Record<string, unknown>>({
  esqlQuery,
  search,
  signal,
  dataView,
  timeRange,
  filters = [],
  variables,
  uiSettings,
}: ExecuteEsqlParams): Promise<TDocument[]> {
  const esQueryConfig = getEsQueryConfig(uiSettings);
  const timeFilter =
    timeRange && dataView?.timeFieldName
      ? getTime(dataView, timeRange, { fieldName: dataView.timeFieldName })
      : undefined;
  const filtersWithTime = [...(timeFilter ? [timeFilter] : []), ...filters];
  const filter =
    filtersWithTime.length > 0
      ? buildEsQuery(undefined, [], filtersWithTime, esQueryConfig)
      : undefined;

  const { response } = await getESQLResults({
    esqlQuery,
    search,
    signal,
    filter,
    timeRange,
    variables,
    ...getMetricsExecutionContext(
      MetricsExecutionContextAction.FETCH,
      MetricsExecutionContextName.METRICS_INFO
    ),
  });

  const errorMessage = getErrorMessageFromEsqlResponse(response as object);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return esqlResultToPlainObjects<TDocument>(response);
}
