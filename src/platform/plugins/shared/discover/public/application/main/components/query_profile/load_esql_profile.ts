/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ESQLControlVariable } from '@kbn/esql-types';
import {
  fixESQLQueryWithVariables,
  getNamedParams,
  getProjectRoutingFromEsqlQuery,
} from '@kbn/esql-utils';
import { buildEsQuery, getTimeZoneFromSettings, type Filter, type TimeRange } from '@kbn/es-query';
import type { IUiSettingsClient } from '@kbn/core/public';
import { getEsQueryConfig, getTime } from '@kbn/data-plugin/common';
import type { ISearchStart } from '@kbn/data-plugin/public';
import { aggregateEsqlProfile, type QueryProfileView } from './aggregate_esql_profile';

export interface LoadEsqlQueryProfileParams {
  search: ISearchStart;
  query: string;
  filters: Filter[];
  timeRange?: TimeRange;
  timeFieldName?: string;
  esqlVariables?: ESQLControlVariable[];
  uiSettings: IUiSettingsClient;
  approximation?: boolean;
  projectRouting?: string;
  abortSignal: AbortSignal;
}

/** Re-runs an ES|QL table query with `profile: true` and returns the flyout view. */
export async function loadEsqlQueryProfile({
  search,
  query,
  filters,
  timeRange,
  timeFieldName,
  esqlVariables,
  uiSettings,
  approximation,
  projectRouting,
  abortSignal,
}: LoadEsqlQueryProfileParams): Promise<QueryProfileView> {
  const fixedQuery = fixESQLQueryWithVariables(query, esqlVariables ?? []);
  const esQueryConfigs = getEsQueryConfig(uiSettings);
  const namedParams = getNamedParams(fixedQuery, timeRange, esqlVariables);
  const timeFilter = timeRange && getTime(undefined, timeRange, { fieldName: timeFieldName });
  const appliedFilters = [...filters, ...(timeFilter ? [timeFilter] : [])];
  const filter = appliedFilters.length
    ? buildEsQuery(undefined, [], appliedFilters, esQueryConfigs)
    : undefined;

  const { rawResponse } = await search.esql(
    {
      query: fixedQuery,
      ...(namedParams.length ? { params: namedParams } : {}),
      ...(filter ? { filter } : {}),
      timeZone: esQueryConfigs.dateFormatTZ
        ? getTimeZoneFromSettings(esQueryConfigs.dateFormatTZ)
        : 'UTC',
    },
    {
      abortSignal,
      dropNullColumns: true,
      profile: true,
      approximation,
      projectRouting: getProjectRoutingFromEsqlQuery(fixedQuery) ?? projectRouting,
    }
  );

  if (rawResponse.profile == null) {
    throw new Error(
      i18n.translate('discover.queryProfile.missingProfileError', {
        defaultMessage: 'This response did not include a query profile.',
      })
    );
  }

  return aggregateEsqlProfile(rawResponse.profile);
}
