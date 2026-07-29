/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, BasicPrettyPrinter } from '@elastic/esql';

export const ESQL_NULLIFY_UNMAPPED_FIELDS = 'SET unmapped_fields="NULLIFY";';

// Discover drops the SET header when the query handed to openInNewTab spans multiple lines.
// The Parser round-trip collapses @kbn/esql-composer's multiline output to a single line.
export const withNullifyUnmappedFields = (esqlQuery: string): string => {
  if (esqlQuery.startsWith(ESQL_NULLIFY_UNMAPPED_FIELDS)) {
    return esqlQuery;
  }
  const { root } = Parser.parse(esqlQuery);
  return `${ESQL_NULLIFY_UNMAPPED_FIELDS} ${BasicPrettyPrinter.print(root)}`;
};
