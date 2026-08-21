/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const EXEMPLARS_SERIES_ID = 'exemplar';

/**
 * Normalized exemplar point the marker and flyout consume. The consumer (e.g. the
 * Metrics Experience) fetches exemplars from Elasticsearch and maps the OTel /
 * Prometheus documents onto this shape before passing them to the chart.
 */
export interface ExemplarPoint {
  x: number;
  y: number;
  traceId?: string;
  spanId?: string;
}

/**
 * Parses the exemplars passed through the expression as a JSON string. Returns an
 * empty array for missing or malformed input so the chart renders no markers.
 */
export const parseExemplars = (json?: string): ExemplarPoint[] => {
  if (!json) {
    return [];
  }
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as ExemplarPoint[]) : [];
  } catch (e) {
    return [];
  }
};
