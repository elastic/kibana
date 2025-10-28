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
  } = autocompleteContext;
  const suggestions: monaco.languages.CompletionItem[] = [];
  const lastPathSegment = autocompleteContext.lineParseResult?.pathSegments?.pop() ?? null;
  // We're inside a variable expression, provide context-based completions
  if (contextSchema instanceof z.ZodObject) {
    const contextKeys = Object.keys(contextSchema.shape);

    // Filter based on what the user has typed so far
    const filteredKeys = lastPathSegment
      ? contextKeys.filter((key) => key.startsWith(lastPathSegment))
      : contextKeys;

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
