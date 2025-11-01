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
import { wrapAsMonacoSuggestion } from './wrap_as_monaco_suggestion';
import { getDetailedTypeDescription } from '../../../../../../../common/lib/zod';
import type { AutocompleteContext } from '../../context/autocomplete.types';
import { isVariableLineParseResult } from '../../context/parse_line_for_completion';

export function getVariableSuggestions(autocompleteContext: AutocompleteContext) {
  const {
    triggerCharacter,
    range,
    contextSchema,
    contextScopedToPath,
    scalarType,
    shouldBeQuoted,
    shouldUseCurlyBraces,
    lineParseResult,
  } = autocompleteContext;

  if (!lineParseResult || !isVariableLineParseResult(lineParseResult)) {
    return [];
  }

  const suggestions: monaco.languages.CompletionItem[] = [];
  const currentSchema: z.ZodType | null = contextSchema;

  // The contextSchema passed in is already scoped to the appropriate level
  // based on the cursor position in the YAML. We don't need to navigate
  // through the path segments because buildAutocompleteContext has already
  // done that for us.

  // Check if we're trying to access a non-existent path
  if (lineParseResult.fullKey && contextScopedToPath !== null) {
    const fullKeySegments = lineParseResult.fullKey.split('.');
    const scopedPathSegments = contextScopedToPath.split('.');

    // If scopedToPath is empty string, it means we're at the root
    const scopedSegmentCount = contextScopedToPath === '' ? 0 : scopedPathSegments.length;

    // Check if we're accessing a path that doesn't exist
    // This happens when the fullKey has more segments than the scoped path,
    // and we're not just typing the next valid segment
    const segmentDiff = fullKeySegments.length - scopedSegmentCount;

    // If the difference is > 1, we're definitely in a non-existent path
    // e.g., consts.docs.a where docs doesn't exist (diff would be 2)
    // If the difference is 1 and we're not currently typing (lastPathSegment is null),
    // it means we just typed a dot after a non-existent path
    // e.g., consts.docs. where docs doesn't exist
    if (segmentDiff > 1 || (segmentDiff === 1 && lineParseResult.lastPathSegment === null)) {
      return [];
    }
  }

  if (
    !(currentSchema instanceof z.ZodObject) ||
    !currentSchema.shape ||
    Object.keys(currentSchema.shape).length === 0
  ) {
    return [];
  }

  // Get all keys from the current schema
  const keys = Object.keys(currentSchema.shape);

  // Filter keys based on lastPathSegment if it exists
  const filteredKeys =
    lineParseResult.lastPathSegment !== null
      ? keys.filter((key) => key.startsWith(lineParseResult.lastPathSegment ?? ''))
      : keys;

  for (const key of filteredKeys) {
    const keySchema = currentSchema.shape[key];
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

  return suggestions;
}
