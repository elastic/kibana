/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Elasticsearch silently truncates ES|QL results at this row count; callers warn when a query
 * hits it.
 */
export const ESQL_ROW_LIMIT = 10_000;

/**
 * Quotes a value as an ES|QL string literal. Values come from Elasticsearch or CLI flags, but
 * they still end up inside query text, so they are escaped rather than trusted.
 */
export const quoteEsqlString = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** Comma-separated ES|QL string literals, for use inside `IN (...)`. */
export const inList = (values: readonly string[]): string => values.map(quoteEsqlString).join(', ');
