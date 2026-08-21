/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { XYBubbleDetail, XYBubblePoint } from '@kbn/lens-common';
import type { Filter, TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { executeEsqlQuery } from '../../observability/metrics/utils/execute_esql_query';

// Standalone exemplar data stream from the "Exemplar support in ES" proposal.
const EXEMPLARS_INDEX_PATTERN = 'metrics.exemplars-*';
const MAX_EXEMPLARS = 100;

/** Source field of the trace id detail, used to open the trace in Discover. */
export const TRACE_ID_FIELD = 'trace.id';

const LABELS = {
  timestamp: i18n.translate('metricsExperience.exemplars.timestampLabel', {
    defaultMessage: 'Timestamp',
  }),
  value: i18n.translate('metricsExperience.exemplars.valueLabel', { defaultMessage: 'Value' }),
  traceId: i18n.translate('metricsExperience.exemplars.traceIdLabel', {
    defaultMessage: 'Trace ID',
  }),
  spanId: i18n.translate('metricsExperience.exemplars.spanIdLabel', { defaultMessage: 'Span ID' }),
  service: i18n.translate('metricsExperience.exemplars.serviceLabel', {
    defaultMessage: 'Service',
  }),
  host: i18n.translate('metricsExperience.exemplars.hostLabel', { defaultMessage: 'Host' }),
  route: i18n.translate('metricsExperience.exemplars.routeLabel', { defaultMessage: 'Route' }),
  method: i18n.translate('metricsExperience.exemplars.methodLabel', { defaultMessage: 'Method' }),
  threadId: i18n.translate('metricsExperience.exemplars.threadIdLabel', {
    defaultMessage: 'Thread ID',
  }),
};

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
const toDisplayString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value || undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

/**
 * Fetches exemplars for a metric and maps the OTel / Prometheus documents onto the
 * chart's generic bubble points. Trace/span ids are top-level for OTel and nested
 * under `exemplar_labels` for Prometheus. Only exemplars that carry a trace id get
 * details (metadata rows), so they are the only clickable ones; the rest render as
 * hover-only markers. Fields absent in one format are simply skipped.
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
}: FetchExemplarsParams): Promise<XYBubblePoint[]> {
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
    .map((row) => {
      const x = Date.parse(String(row['@timestamp']));
      const y = toNumber(row[valueColumn]);
      const traceId = toOptionalString(row.trace_id ?? row['exemplar_labels.trace_id']);

      // Only trace-linked exemplars are clickable, so only they carry details.
      if (!traceId) {
        return { x, y, details: undefined };
      }

      const spanId = toOptionalString(row.span_id ?? row['exemplar_labels.span_id']);
      const service = toDisplayString(row['resource.attributes.service.name'] ?? row['labels.job']);
      const host = toDisplayString(row['resource.attributes.host.name'] ?? row['labels.instance']);
      const route = toDisplayString(row['attributes.http.route'] ?? row['labels.route']);
      const method = toDisplayString(row['attributes.http.request.method'] ?? row['labels.method']);
      const threadId = toDisplayString(
        row['filtered_attributes.thread.id'] ?? row['exemplar_labels.thread_id']
      );

      const optional = (
        field: string,
        label: string,
        value: string | undefined
      ): XYBubbleDetail[] => (value ? [{ field, label, value }] : []);

      const details: XYBubbleDetail[] = [
        { field: '@timestamp', label: LABELS.timestamp, value: new Date(x).toISOString() },
        ...(Number.isFinite(y)
          ? [{ field: valueColumn, label: LABELS.value, value: String(y) }]
          : []),
        { field: TRACE_ID_FIELD, label: LABELS.traceId, value: traceId },
        ...optional('span.id', LABELS.spanId, spanId),
        ...optional('service.name', LABELS.service, service),
        ...optional('host.name', LABELS.host, host),
        ...optional('http.route', LABELS.route, route),
        ...optional('http.request.method', LABELS.method, method),
        ...optional('thread.id', LABELS.threadId, threadId),
      ];

      return { x, y, details };
    })
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}
