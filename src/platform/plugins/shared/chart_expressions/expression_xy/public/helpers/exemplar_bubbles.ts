/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BubblePoint } from './bubbles';

interface EsqlLikeResponse {
  columns?: Array<{ name: string }>;
  values?: unknown[][];
}

const toRows = (response: EsqlLikeResponse): Array<Record<string, unknown>> => {
  const columns = response.columns ?? [];
  const values = response.values ?? [];
  return values.map((row) => Object.fromEntries(columns.map((col, i) => [col.name, row[i]])));
};

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value ? value : undefined;

/**
 * Maps an exemplar ES|QL response onto generic bubble points. Trace/span ids are
 * top-level for OTel and nested under `exemplar_labels` for Prometheus, and become
 * the bubble's `details` so the consumer can open the trace. Only exemplars with a
 * trace id carry details; the rest render as plain markers.
 */
export const mapExemplarResponse = (
  response: EsqlLikeResponse,
  valueColumn: string
): BubblePoint[] =>
  toRows(response)
    .map((row) => {
      const x = Date.parse(String(row['@timestamp']));
      const y = Number(row[valueColumn]);
      const traceId = asString(row.trace_id ?? row['exemplar_labels.trace_id']);
      if (!traceId) {
        return { x, y };
      }
      const spanId = asString(row.span_id ?? row['exemplar_labels.span_id']);
      const details = [
        { field: 'trace.id', label: 'trace.id', value: traceId },
        ...(spanId ? [{ field: 'span.id', label: 'span.id', value: spanId }] : []),
      ];
      return { x, y, details };
    })
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
