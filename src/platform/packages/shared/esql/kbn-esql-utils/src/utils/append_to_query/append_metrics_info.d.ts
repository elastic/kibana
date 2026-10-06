/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Appends "| METRICS_INFO" to an ES|QL query if it has no transformational commands.
 * SORT is removed; LIMIT, if present, is re-appended at the end.
 * When `dimensions` are provided, a pre-METRICS_INFO `WHERE ... IS NOT NULL`
 * (document-level) filter is added. `postFilter`, if provided, is appended as a
 * generic `WHERE` clause after METRICS_INFO (before LIMIT).
 * @param esql the ES|QL query.
 * @param dimensions selected dimension field names for the pre-METRICS_INFO IS NOT NULL filter.
 * @param postFilter caller-supplied WHERE clause to apply after METRICS_INFO.
 * @returns the query with "| METRICS_INFO" added, or an empty string if not allowed.
 */
export declare function buildMetricsInfoQuery(
  esql?: string,
  dimensions?: string[],
  postFilter?: string
): string;
