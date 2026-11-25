/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { LATENCY_MAP_ROWS } from '../query/duration_rows';
import { OPERATION_COLUMN, SERVICE_NAME_FIELD } from '../query/fields';
import type { DurationStats } from '../types';
import { detectDurationBands } from './detect_bands';
import type { DurationBand } from './detect_bands';

/** A request type: a service and its transaction, span, or OTel span name. */
export interface LatencyMapOperation {
  service: string;
  name: string;
}

export interface OperationHistogram {
  operation: LatencyMapOperation;
  spans: number;
  /** Span and failure counts per duration row. */
  rowCounts: number[];
  rowErrors: number[];
}

export interface OperationBands {
  operation: LatencyMapOperation;
  /** Share of the map's spans that belong to the operation. */
  share: number;
  bands: DurationBand[];
}

export interface MapBands {
  /** The operation the map shows, when one operation holds nearly all its spans. */
  focused?: OperationBands;
  /** Otherwise, the operations with distinct duration groups, largest first. */
  operations: OperationBands[];
}

/** From this share of the spans on, the map shows one operation. */
const FOCUS_SHARE = 0.9;
/** Fewer spans than this make a histogram too thin for groups. */
const MIN_OPERATION_SPANS = 100;
/** More operations than this make the list too long to scan. */
export const MAX_LISTED_OPERATIONS = 8;

export const isSameOperation = (a: LatencyMapOperation, b: LatencyMapOperation) =>
  a.service === b.service && a.name === b.name;

/** `scale` is how many spans each counted span stands for, as in `addTableToGrid`. */
export function parseOperationHistograms(
  table: ESQLSearchResponse,
  scale = 1
): OperationHistogram[] {
  const [serviceIndex, nameIndex, rowIndex, spansIndex, failedIndex] = [
    SERVICE_NAME_FIELD,
    OPERATION_COLUMN,
    'yi',
    'spans',
    'failed',
  ].map((name) => table.columns.findIndex((column) => column.name === name));
  const byKey = new Map<string, OperationHistogram>();
  for (const row of table.values) {
    const service = row[serviceIndex];
    const name = row[nameIndex];
    const yi = Number(row[rowIndex]);
    if (service == null || name == null || !(yi >= 0 && yi < LATENCY_MAP_ROWS)) continue;
    const key = JSON.stringify([service, name]);
    let histogram = byKey.get(key);
    if (!histogram) {
      histogram = {
        operation: { service: String(service), name: String(name) },
        spans: 0,
        rowCounts: new Array<number>(LATENCY_MAP_ROWS).fill(0),
        rowErrors: new Array<number>(LATENCY_MAP_ROWS).fill(0),
      };
      byKey.set(key, histogram);
    }
    const spans = Number(row[spansIndex]) * scale;
    histogram.spans += spans;
    histogram.rowCounts[yi] += spans;
    histogram.rowErrors[yi] += Number(row[failedIndex] ?? 0) * scale;
  }
  return [...byKey.values()];
}

/**
 * Duration bands per operation. Across operations, modes mostly tell the operations apart,
 * so bands are drawn only when the map shows one operation. Otherwise the operations with
 * distinct duration groups are listed, to show one of them.
 */
export function getMapBands(histograms: OperationHistogram[], stats: DurationStats): MapBands {
  // Against every span of the map, not only the named ones: where most spans have no
  // operation or service, a small named operation is not the map's, and its bands would be
  // drawn over spans that are not its.
  const total = Math.max(
    stats.spans,
    histograms.reduce((sum, histogram) => sum + histogram.spans, 0)
  );
  if (!total) return { operations: [] };
  const toBands = (histogram: OperationHistogram): OperationBands => ({
    operation: histogram.operation,
    share: histogram.spans / total,
    bands: detectDurationBands(histogram.rowCounts, stats, histogram.rowErrors),
  });

  const dominant = histograms.find((histogram) => histogram.spans >= total * FOCUS_SHARE);
  if (dominant) return { focused: toBands(dominant), operations: [] };

  return {
    operations: histograms
      .filter((histogram) => histogram.spans >= MIN_OPERATION_SPANS)
      .sort((a, b) => b.spans - a.spans)
      .map(toBands)
      .filter(({ bands }) => bands.length > 1)
      .slice(0, MAX_LISTED_OPERATIONS),
  };
}
