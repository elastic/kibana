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
  pattern: string
): string | undefined => {
  const suffix = groupingCommands(field);
  if (!esql.endsWith(suffix)) {
    return undefined;
  }

  // RLIKE uses Lucene regexes. Drop lazy modifiers and escape Lucene-only operators in tokens.
  const regex = pattern.replace(/(\.[*+])\?/g, '$1').replace(/[@#&~<>"]/g, '\\$&');
  const source = esql.slice(0, -suffix.length);
  return `${source}\n  | WHERE ${escapeEsqlColumnName(field)} RLIKE ${escapeStringValue(regex)}`;
};
