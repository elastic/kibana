/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableRow } from '@kbn/expressions-plugin/common';
import { getAccessorByDimension } from '@kbn/chart-expressions-common';
import type { CommonXYDataLayerConfig } from '../../common/types';

export const EXEMPLARS_SERIES_ID = 'exemplar';

const MAX_EXEMPLARS = 15;
const HEX_CHARS = '0123456789abcdef';
// Minimum/maximum lift above the line, as a fraction of the series' value range.
const MIN_LIFT = 0.15;
const MAX_LIFT = 0.65;

/**
 * Normalized exemplar shape the marker and flyout consume. Mapping real OTel /
 * Prometheus exemplar documents onto this shape is deferred to the productionized
 * implementation (see the exemplars spike).
 */
export interface ExemplarPoint {
  x: number;
  y: number;
  traceId: string;
  spanId: string;
}

const randomHex = (length: number): string => {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)];
  }
  return out;
};

const toTimestamp = (value: unknown): number =>
  typeof value === 'number' ? value : Date.parse(String(value));

/**
 * Spread of the series' finite y-values. Used to lift exemplars above the line;
 * falls back to the value magnitude (or 1) for flat lines so markers still separate.
 */
const getYRange = (rows: DatatableRow[], columnId: string): number => {
  let min = Infinity;
  let max = -Infinity;
  for (const row of rows) {
    const value = Number(row[columnId]);
    if (!Number.isFinite(value)) {
      continue;
    }
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (min === Infinity) {
    return 1;
  }
  return max - min || Math.abs(max) || 1;
};

/**
 * POC-only generator that fabricates exemplar markers from the chart's own data.
 * Real exemplars are individual (often outlier) observations, so instead of
 * sitting on the aggregated line the markers are scattered above it by a fraction
 * of the series' value range. It samples an evenly-spaced subset of each data
 * layer's rows so a handful of clickable markers always render.
 *
 * ponytail: mock data - random IDs don't resolve to real traces and co-located
 * exemplars aren't clustered. Upgrade: fetch real exemplars via ES|QL against
 * `metrics.exemplars-*` and map them onto ExemplarPoint (tracked in kibana#273398).
 */
export const generateMockExemplars = (dataLayers: CommonXYDataLayerConfig[]): ExemplarPoint[] => {
  const exemplars: ExemplarPoint[] = [];

  for (const layer of dataLayers) {
    const { table, xAccessor, accessors } = layer;
    if (!xAccessor || !accessors.length || !table?.rows?.length) {
      continue;
    }

    const xColumnId = getAccessorByDimension(xAccessor, table.columns);
    const yColumnId = getAccessorByDimension(accessors[0], table.columns);
    const yRange = getYRange(table.rows, yColumnId);

    const step = Math.max(1, Math.ceil(table.rows.length / MAX_EXEMPLARS));
    for (let i = 0; i < table.rows.length; i += step) {
      const row = table.rows[i];
      const x = toTimestamp(row[xColumnId]);
      const lineY = Number(row[yColumnId]);
      if (!Number.isFinite(x) || !Number.isFinite(lineY)) {
        continue;
      }

      const lift = yRange * (MIN_LIFT + Math.random() * (MAX_LIFT - MIN_LIFT));
      const y = lineY + lift;

      exemplars.push({ x, y, traceId: randomHex(32), spanId: randomHex(16) });
      if (exemplars.length >= MAX_EXEMPLARS) {
        return exemplars;
      }
    }
  }

  return exemplars;
};
