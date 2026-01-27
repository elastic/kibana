/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import { getShape } from '@kbn/workflows/common/utils/zod';
import { wrapAsMonacoSuggestion } from './wrap_as_monaco_suggestion';
import { getDetailedTypeDescription } from '../../../../../../../common/lib/zod';
import type { AutocompleteContext } from '../../context/autocomplete.types';
import { isVariableLineParseResult } from '../../context/parse_line_for_completion';

/**
 * Checks if the cursor is already inside curly braces ({{ }})
 * by counting opening and closing braces before the cursor position
 */
function isInsideCurlyBraces(lineUpToCursor: string): boolean {
  // Count opening {{ and closing }}
  const openBraces = (lineUpToCursor.match(/\{\{/g) || []).length;
  const closeBraces = (lineUpToCursor.match(/\}\}/g) || []).length;
  // If we have more opening braces than closing, we're inside
  return openBraces > closeBraces;
}

/**
 * Validates if the path being accessed exists in the schema
 * Returns true if the path is valid, false if it doesn't exist
 */
function isValidPath(
  fullKey: string,
  contextScopedToPath: string | null,
  lastPathSegment: string | null
): boolean {
  if (!fullKey || contextScopedToPath === null) {
    return true;
  }

  const fullKeySegments = fullKey.split('.');
  const scopedPathSegments = contextScopedToPath.split('.');

  // If scopedToPath is empty string, it means we're at the root
  const scopedSegmentCount = contextScopedToPath === '' ? 0 : scopedPathSegments.length;

  // Check if we're accessing a path that doesn't exist
  // This happens when the fullKey has more segments than the scoped path,
  // and we're not just typing the next valid segment
  const segmentDiff = fullKeySegments.length - scopedSegmentCount;

  // If fullKey exactly matches contextScopedToPath (segmentDiff === 0),
  // we're already at that level and should show its properties
  // If the difference is > 1, we're definitely in a non-existent path
  // e.g., consts.docs.a where docs doesn't exist (diff would be 2)
  // If the difference is 1 and we're not currently typing (lastPathSegment is null),
  // it means we just typed a dot after a non-existent path
  // e.g., consts.docs. where docs doesn't exist
  return !(segmentDiff > 1 || (segmentDiff === 1 && lastPathSegment === null));
}

export function getVariableSuggestions(autocompleteContext: AutocompleteContext) {
  const {
    triggerCharacter,
    range,
    contextSchema,
    contextScopedToPath,
    focusedYamlPair,
    scalarType,
    lineParseResult,
  } = autocompleteContext;

  if (!lineParseResult || !isVariableLineParseResult(lineParseResult)) {
    return [];
  }
  // We only add quotes if there's nothing other than the full key in the value node
  // But NOT if we're already inside {{ }} braces (completing a variable path)
  const wholePairValue =
    typeof focusedYamlPair?.valueNode.value === 'string' ? focusedYamlPair?.valueNode.value : '';
  const alreadyInsideBraces = isInsideCurlyBraces(autocompleteContext.lineUpToCursor);
  const shouldBeQuoted =
    !alreadyInsideBraces &&
    (scalarType === null || scalarType === 'PLAIN') &&
    (wholePairValue.startsWith('@') || wholePairValue.startsWith('{{') || wholePairValue === '');

  // Do not wrap in curly braces if
  // 1) we're in a foreach block
  // 2) we're completing an existing variable
  // 3) we're completing an @ trigger BUT already inside braces
  const shouldUseCurlyBraces =
    focusedYamlPair?.keyNode.value !== 'foreach' &&
    lineParseResult.matchType === 'at' &&
    !isInsideCurlyBraces(autocompleteContext.lineUpToCursor);

  const suggestions: monaco.languages.CompletionItem[] = [];

  // The contextSchema passed in is already scoped to the appropriate level
  // based on the cursor position in the YAML. We don't need to navigate
  // through the path segments because buildAutocompleteContext has already
  // done that for us.

  // Check if we're trying to access a non-existent path
  if (!isValidPath(lineParseResult.fullKey, contextScopedToPath, lineParseResult.lastPathSegment)) {
    return [];
  }

  const shape = getShape(contextSchema);

  // Get all keys from the current schema
  const keys = Object.keys(shape);

  if (keys.length === 0) {
    return [];
  }

  // Filter keys based on lastPathSegment if it exists
  const filteredKeys =
    lineParseResult.lastPathSegment !== null
      ? keys.filter((key) => key.startsWith(lineParseResult.lastPathSegment ?? ''))
      : keys;

  for (const key of filteredKeys) {
    const keySchema = shape[key];
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
