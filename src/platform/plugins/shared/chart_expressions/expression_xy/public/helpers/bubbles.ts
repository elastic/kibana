/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const BUBBLES_SERIES_ID = 'bubbles';

/** A generic label/value row for a bubble marker; `field` is the optional source
 * field name so consumers can identify specific rows (e.g. trace.id). */
export interface BubbleDetail {
  label: string;
  value: string;
  field?: string;
}

/**
 * A generic bubble marker overlaid on the chart. The consumer decides what a
 * point represents and what its `details` contain; the chart only renders the
 * marker and, when `details` are present, a details popover on click.
 */
export interface BubblePoint {
  x: number;
  y: number;
  details?: BubbleDetail[];
}

/**
 * Parses the bubbles passed through the expression as a JSON string. Returns an
 * empty array for missing or malformed input so the chart renders no markers.
 */
export const parseBubbles = (json?: string): BubblePoint[] => {
  if (!json) {
    return [];
  }
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as BubblePoint[]) : [];
  } catch (e) {
    return [];
  }
};
