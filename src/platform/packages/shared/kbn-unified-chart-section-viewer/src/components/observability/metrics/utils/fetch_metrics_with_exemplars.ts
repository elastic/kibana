/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import { EXEMPLARS_METRIC_NAME_FIELD } from '../../../../common/constants';
import { executeEsqlQuery } from './execute_esql_query';
import { MetricsExecutionContextName } from './execution_context_enums';

/**
 * Querying an exemplars stream or a metric that has no exemplars is an HTTP 400, not an
 * empty result, so every per-metric fetch is gated on this probe. It is a workaround until
 * `TS_EXEMPLARS` exists (elasticsearch#154786).
 */
export const EXEMPLARS_PROBE_QUERY = `FROM exemplars-*.otel-* | STATS BY ${EXEMPLARS_METRIC_NAME_FIELD}`;

export interface FetchMetricsWithExemplarsParams {
  search: ISearchGeneric;
  dataView: DataView;
  uiSettings: IUiSettingsClient;
  profileId: string;
}

/** Resolves to the `metrics.`-prefixed names of the metrics that have exemplars. */
export const fetchMetricsWithExemplars = async ({
  search,
  dataView,
  uiSettings,
  profileId,
}: FetchMetricsWithExemplarsParams): Promise<ReadonlySet<string>> => {
  // No signal (the request is shared across charts) and no time range or filters (this is
  // a schema question, and a filter on an unmapped field would silently return nothing).
  const { rawResponse } = await executeEsqlQuery({
    esqlQuery: EXEMPLARS_PROBE_QUERY,
    search,
    dataView,
    uiSettings,
    profileId,
    executionContextName: MetricsExecutionContextName.EXEMPLARS,
  });

  return new Set(extractMetricNames(rawResponse));
};

// ES stores `http.server.duration`; Kibana's ES|QL field names carry a `metrics.` prefix.
const extractMetricNames = ({ columns, values }: ESQLSearchResponse): string[] => {
  const columnIndex = columns.findIndex(({ name }) => name === EXEMPLARS_METRIC_NAME_FIELD);
  if (columnIndex === -1) {
    return [];
  }

  return values
    .map((row) => row[columnIndex])
    .filter((name): name is string => typeof name === 'string')
    .map((name) => `metrics.${name}`);
};
