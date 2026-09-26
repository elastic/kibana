/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import { EXEMPLARS_INDEX_PREFIX, EXEMPLARS_METRIC_NAME_FIELD } from '../../../../common/constants';
import { executeEsqlQuery } from './execute_esql_query';
import { MetricsExecutionContextName } from './execution_context_enums';

const DATASET_FIELD = 'data_stream.dataset';
const NAMESPACE_FIELD = 'data_stream.namespace';
// One row per metric per stream. Without an explicit limit ES|QL silently caps at 1000 rows;
// 10000 is the engine's maximum (`esql.query.result_truncation_max_size`).
const MAX_PROBE_ROWS = 10000;

/**
 * Querying an exemplars stream that does not exist results in an HTTP 400, not an empty
 * result, so every per-metric fetch requires this probe. Grouping by data stream as well as
 * metric name lets a chart check its own derived stream rather than the whole cluster. It is
 * a workaround until `TS_EXEMPLARS` is available (elasticsearch#154786).
 */
export const EXEMPLARS_PROBE_QUERY = `FROM exemplars-*.otel-* | STATS BY ${EXEMPLARS_METRIC_NAME_FIELD}, ${DATASET_FIELD}, ${NAMESPACE_FIELD} | LIMIT ${MAX_PROBE_ROWS}`;

/** `metrics.`-prefixed metric names that have exemplars, keyed by exemplars data stream. */
export type MetricsWithExemplars = ReadonlyMap<string, ReadonlySet<string>>;

export interface FetchMetricsWithExemplarsParams {
  search: ISearchGeneric;
  dataView: DataView;
  timeRange: TimeRange;
  uiSettings: IUiSettingsClient;
  profileId: string;
}

export const fetchMetricsWithExemplars = async ({
  search,
  dataView,
  timeRange,
  uiSettings,
  profileId,
}: FetchMetricsWithExemplarsParams): Promise<MetricsWithExemplars> => {
  // Bounded to the Discover time range: the per-chart fetches use the same window, so a metric
  // whose exemplars fall outside it would fetch nothing anyway. No signal or filters, because the
  // result is shared by every chart in the fetch.
  const { rawResponse } = await executeEsqlQuery({
    esqlQuery: EXEMPLARS_PROBE_QUERY,
    search,
    dataView,
    timeRange,
    uiSettings,
    profileId,
    executionContextName: MetricsExecutionContextName.EXEMPLARS,
  });

  return groupMetricNamesByStream(rawResponse);
};

// ES stores `http.server.duration`; Kibana's ES|QL field names use a `metrics.` prefix.
const groupMetricNamesByStream = ({
  columns,
  values,
}: ESQLSearchResponse): MetricsWithExemplars => {
  const columnIndex = (field: string) => columns.findIndex(({ name }) => name === field);
  const metricNameIndex = columnIndex(EXEMPLARS_METRIC_NAME_FIELD);
  const datasetIndex = columnIndex(DATASET_FIELD);
  const namespaceIndex = columnIndex(NAMESPACE_FIELD);
  if (metricNameIndex === -1 || datasetIndex === -1 || namespaceIndex === -1) {
    return new Map();
  }

  const byStream = new Map<string, Set<string>>();
  for (const row of values) {
    const metricName = row[metricNameIndex];
    const dataset = row[datasetIndex];
    const namespace = row[namespaceIndex];
    // Skips the null groups STATS BY emits for documents missing any of the three fields.
    if (
      typeof metricName !== 'string' ||
      typeof dataset !== 'string' ||
      typeof namespace !== 'string'
    ) {
      continue;
    }

    const stream = `${EXEMPLARS_INDEX_PREFIX}${dataset}-${namespace}`;
    const names = byStream.get(stream) ?? new Set<string>();
    names.add(`metrics.${metricName}`);
    byStream.set(stream, names);
  }

  return byStream;
};
