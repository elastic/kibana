/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { AutocompleteContext } from '../../context/autocomplete.types';

export function getExecutionIdentitySuggestions({
  line,
  lineParseResult,
  range,
  executionIdentities,
}: AutocompleteContext): monaco.languages.CompletionItem[] {
  if (
    !lineParseResult ||
    lineParseResult.matchType !== 'execution-identity' ||
    !executionIdentities?.length
  ) {
    return [];
  }

  const prefix = lineParseResult.fullKey.toLowerCase();
  const replaceRange =
    lineParseResult.fullKey !== ''
      ? {
          ...range,
          startColumn: lineParseResult.valueStartIndex + 1,
          endColumn: line.length + 1,
        }
      : range;

  return executionIdentities
    .filter(
      (identity) =>
        identity.name.toLowerCase().includes(prefix) ||
        identity.description.toLowerCase().includes(prefix)
    )
    .map((identity, index) => ({
      label: identity.name,
      kind: monaco.languages.CompletionItemKind.Reference,
      detail: identity.description || 'Execution Identity',
      documentation: `Service account: ${identity.name}\nID: ${identity.id}`,
      insertText: identity.name,
      range: replaceRange,
      sortText: String(index).padStart(4, '0'),
      filterText: identity.name,
    }));
}
