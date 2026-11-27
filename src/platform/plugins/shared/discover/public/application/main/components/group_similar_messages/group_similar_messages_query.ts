/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeStringValue } from '@kbn/esql-utils';

const GROUP_MESSAGES =
  '\n  | STATS count = COUNT(*) BY pattern = CATEGORIZE(message)\n  | SORT count DESC';

export const groupSimilarMessages = (esql: string) => esql + GROUP_MESSAGES;

export const getMatchingMessagesQuery = (esql: string, tokens: string): string | undefined => {
  if (!esql.endsWith(GROUP_MESSAGES)) {
    return undefined;
  }

  // Match the message as it exists at the end of the original pipeline, including after a LIMIT.
  const source = esql.slice(0, -GROUP_MESSAGES.length);
  return `${source}\n  | WHERE MATCH(TO_TEXT(TO_STRING(message)), ${escapeStringValue(
    tokens
  )}, {"auto_generate_synonyms_phrase_query": false, "fuzziness": 0, "operator": "AND"})`;
};
