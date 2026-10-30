/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The latency map keeps its selection in the Discover ES|QL query, as a WHERE clause it
 * writes (`selectionToEsqlCondition`) and recognises (`parseSelectionCondition`, both from
 * `@kbn/trace-latency-map`). These helpers append such a clause to the query and remove it.
 */

export const appendWhere = (query: string, clause: string) => `${query}\n| WHERE ${clause}`;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Remove one `| WHERE <clause>`, wherever it sits in the query. */
export const removeWhere = (query: string, clause: string) =>
  query.replace(new RegExp(`\\s*\\|\\s*WHERE\\s+${escapeRegExp(clause)}`, 'i'), '');
