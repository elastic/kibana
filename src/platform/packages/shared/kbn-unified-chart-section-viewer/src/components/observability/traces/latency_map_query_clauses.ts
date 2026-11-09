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
 * `@kbn/trace-latency-map`). Appending uses `appendToESQLQuery` from `@kbn/esql-utils`;
 * removing the clause again has no shared helper, so it lives here.
 */

import { appendToESQLQuery } from '@kbn/esql-utils';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Remove one `| WHERE <clause>`, wherever it sits in the query. */
export const removeWhere = (query: string, clause: string) =>
  query.replace(new RegExp(`\\s*\\|\\s*WHERE\\s+${escapeRegExp(clause)}`, 'i'), '');

const UNMAPPED_FIELDS_SET = /\bSET\s+unmapped_fields\b/i;

/**
 * Append a WHERE clause the map writes. It names fields of every trace family (`duration` of
 * OTel, `span.duration.us` of classic APM, `status.code`), and a source that maps only some of
 * them would fail with an unknown column, so the query gets `SET unmapped_fields="NULLIFY"`, as
 * the map's own queries have, unless it already sets it.
 */
export const appendMapClause = (query: string, clause: string) => {
  const appended = appendToESQLQuery(query, `| WHERE ${clause}`);
  return UNMAPPED_FIELDS_SET.test(appended)
    ? appended
    : `SET unmapped_fields="NULLIFY";\n${appended}`;
};
