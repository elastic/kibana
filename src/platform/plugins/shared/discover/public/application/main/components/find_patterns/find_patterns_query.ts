/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeEsqlColumnName, escapeStringValue } from '@kbn/esql-utils';

const groupingCommands = (field: string) =>
  `\n  | STATS count = COUNT(*) BY pattern = CATEGORIZE(${escapeEsqlColumnName(field)})\n  | SORT count DESC`;

export const findPatterns = (esql: string, field: string) => esql + groupingCommands(field);

export const getMatchingMessagesQuery = (
  esql: string,
  field: string,
  tokens: string
): string | undefined => {
  const suffix = groupingCommands(field);
  if (!esql.endsWith(suffix)) {
    return undefined;
  }

  // Match the selected field at the end of the original pipeline, including after a LIMIT.
  const source = esql.slice(0, -suffix.length);
  return `${source}\n  | WHERE MATCH(TO_TEXT(TO_STRING(${escapeEsqlColumnName(field)})), ${escapeStringValue(tokens)}, {"auto_generate_synonyms_phrase_query": false, "fuzziness": 0, "operator": "AND"})`;
};
