/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYExemplarPoint } from '@kbn/lens-common';
import type { Filter, TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { executeEsqlQuery } from '../../observability/metrics/utils/execute_esql_query';

// Standalone exemplar data stream from the "Exemplar support in ES" proposal.
const EXEMPLARS_INDEX_PATTERN = 'metrics.exemplars-*';
const MAX_EXEMPLARS = 100;

export interface FetchExemplarsParams {
  /** Metric value field name, used to correlate and resolve the value column. */
  metricName: string;
  search: ISearchGeneric;
  dataView: DataView;
  timeRange?: TimeRange;
  filters?: Filter[];
  variables?: ESQLControlVariable[];
  uiSettings: IUiSettingsClient;
  profileId: string;
  signal?: AbortSignal;
}

const toNumber = (value: unknown): number => (typeof value === 'number' ? value : Number(value));
const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value ? value : undefined;

/**
 * Fetches exemplars for a metric and normalizes the OTel / Prometheus documents
 * onto the chart's `{ x, y, traceId, spanId }` shape. Trace/span ids are top-level
 * for OTel and nested under `exemplar_labels` for Prometheus.
 */
export async function fetchExemplars({
  metricName,
  search,
  dataView,
  timeRange,
  filters,
  variables,
  uiSettings,
  profileId,
  signal,
}: FetchExemplarsParams): Promise<XYExemplarPoint[]> {
  const valueColumn = `metrics.${metricName}`;
  const esqlQuery = `FROM ${EXEMPLARS_INDEX_PATTERN} | WHERE ${valueColumn} IS NOT NULL | SORT @timestamp | LIMIT ${MAX_EXEMPLARS}`;

  const { documents } = await executeEsqlQuery<Record<string, unknown>>({
    esqlQuery,
    search,
    signal,
    dataView,
    timeRange,
    filters,
    variables,
    uiSettings,
    profileId,
  });

  return documents
    .map((row) => ({
      x: Date.parse(String(row['@timestamp'])),
      y: toNumber(row[valueColumn]),
      traceId: toOptionalString(row.trace_id ?? row['exemplar_labels.trace_id']),
      spanId: toOptionalString(row.span_id ?? row['exemplar_labels.span_id']),
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}
