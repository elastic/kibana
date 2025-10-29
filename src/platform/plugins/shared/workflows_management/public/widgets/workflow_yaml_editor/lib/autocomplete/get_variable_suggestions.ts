/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import { z } from '@kbn/zod';
import type { AutocompleteContext } from './autocomplete.types';
import { isVariableLineParseResult } from './parse_line_for_completion';
import { wrapAsMonacoSuggestion } from './wrap_as_monaco_suggestion';
import { getDetailedTypeDescription } from '../../../../../common/lib/zod';

export function getVariableSuggestions(autocompleteContext: AutocompleteContext) {
  const {
    triggerCharacter,
    range,
    contextSchema,
    scalarType,
    shouldBeQuoted,
    shouldUseCurlyBraces,
    lineParseResult,
  } = autocompleteContext;

  if (!lineParseResult || !isVariableLineParseResult(lineParseResult)) {
    return [];
  }

  const suggestions: monaco.languages.CompletionItem[] = [];

  console.log('getVariableSuggestions - lineParseResult:', lineParseResult);

  // We're inside a variable expression, provide context-based completions
  if (contextSchema instanceof z.ZodObject) {
    const contextKeys = Object.keys(contextSchema.shape);
    console.log('contextKeys:', contextKeys);
    console.log('lastPathSegment:', lineParseResult.lastPathSegment);

    // Filter based on what the user has typed so far
    const filteredKeys =
      lineParseResult.lastPathSegment !== null
        ? contextKeys.filter((key) => key.startsWith(lineParseResult.lastPathSegment ?? ''))
        : contextKeys;
    console.log('filteredKeys:', filteredKeys);

    for (const key of filteredKeys) {
      const keySchema = contextSchema.shape[key];
      const propertyTypeName = getDetailedTypeDescription(keySchema, { singleLine: true });

      suggestions.push(
        wrapAsMonacoSuggestion(
          key,
          triggerCharacter,
          range,
          scalarType,
          shouldBeQuoted,
          propertyTypeName,
          keySchema?.description,
          shouldUseCurlyBraces
        )
      );
    }
  }

  return suggestions;
}
