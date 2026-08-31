/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Source field of the trace id detail, used to open the trace in Discover. */
export const TRACE_ID_FIELD = 'trace.id';

// Standalone exemplar data stream from the "Exemplar support in ES" proposal.
const EXEMPLARS_INDEX_PATTERN = 'metrics.exemplars-*';
const MAX_EXEMPLARS = 100;

export interface ExemplarsQuery {
  query: string;
  valueColumn: string;
}

/**
 * Builds the ES|QL query and value column that Lens uses to fetch this metric's
 * exemplars at render time. Lens runs the query itself, so the overlay stays in
 * sync wherever the chart renders (metrics grid, dashboards, Discover).
 */
export const buildExemplarsQuery = (metricName: string): ExemplarsQuery => {
  const valueColumn = `metrics.${metricName}`;
  return {
    query: `FROM ${EXEMPLARS_INDEX_PATTERN} | WHERE ${valueColumn} IS NOT NULL | SORT @timestamp | LIMIT ${MAX_EXEMPLARS}`,
    valueColumn,
  };
};
