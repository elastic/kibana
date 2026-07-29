/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, BasicPrettyPrinter } from '@elastic/esql';

export type UnmappedFieldsPolicy = 'NULLIFY' | 'LOAD';

interface WithUnmappedFieldsOptions {
  policy?: UnmappedFieldsPolicy;
  multiline?: boolean;
}

export const ESQL_NULLIFY_UNMAPPED_FIELDS = 'SET unmapped_fields="NULLIFY";';

// multiline: false collapses to single line via Parser round-trip — Discover drops the SET header for multiline queries.
export const withUnmappedFields = (
  esqlQuery: string,
  { policy = 'NULLIFY', multiline = true }: WithUnmappedFieldsOptions = {}
): string => {
  const header = `SET unmapped_fields="${policy}";`;
  if (esqlQuery.startsWith(header)) {
    return esqlQuery;
  }
  if (multiline) {
    return `${header}\n${esqlQuery}`;
  }
  const { root } = Parser.parse(esqlQuery);
  return `${header} ${BasicPrettyPrinter.print(root)}`;
};
