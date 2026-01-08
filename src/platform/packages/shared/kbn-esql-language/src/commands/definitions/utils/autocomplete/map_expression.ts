/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../registry/types';
import {
  buildAddValuePlaceholder,
  buildMapKeySuggestion,
  buildMapValueCompleteItem,
  type MapValueType,
} from '../../../registry/complete_items';
import { findFinalWord } from './helpers';

// Strip quoted segments so foo(bar) inside strings doesn't get picked as a function
export const DOUBLE_QUOTED_STRING_REGEX = /"([^"\\]|\\.)*"/g;
// Extracts all object keys from "key": patterns in JSON-like syntax
export const OBJECT_KEYS_REGEX = /"([^"]+)"\s*:/g;

export interface MapParameterValues {
  type: MapValueType;
  suggestions?: ISuggestionItem[];
}

export type MapParameters = Record<string, MapParameterValues>;

/**
 * This function provides suggestions for map expressions within a command.
 *
 * You must provide a record of available entries, where each key is a parameter name and the value is an
 * array of suggestions for that parameter.
 *
 * Examples:
 *  | COMPLETION "prompt" WITH {                       ---> suggests parameters names
 *  | COMPLETION "prompt" WITH { "                     ---> suggests parameters names
 *  | COMPLETION "prompt" WITH { "param1":           ---> suggests parameter values
 *  | COMPLETION "prompt" WITH { "param1": "           ---> suggests parameter values
 *  | COMPLETION "prompt" WITH { "param1": "value",    ---> suggests parameter names that were not used
 *  | COMPLETION "prompt" WITH { "param1": "value", "  ---> suggests parameter names that were not used
 *  | COMPLETION "prompt" WITH { "nestedParam": {      ---> suggests []
 *
 * This helper does not suggest enclosing brackets.
 * This helper does not support suggestions within nested maps, we don't have currently a case where it's needed,
 *  so no suggestions will be provided within a nested map.
 *
 * @param innerText
 * @param availableParameters
 */
export function getCommandMapExpressionSuggestions(
  innerText: string,
  availableParameters: MapParameters,
  includePlaceholder = false
): ISuggestionItem[] {
  const finalWord = findFinalWord(innerText);

  // Return no suggestions if we're inside a nested map (nesting level > 1)
  if (getMapNestingLevel(innerText) > 1) {
    return [];
  }
  // Suggest a parameter entry after { or after a comma or when opening quotes after those
  if (/{\s*"?$/i.test(innerText) || /,\s*"?$/.test(innerText)) {
    const usedParams = new Set([...innerText.matchAll(OBJECT_KEYS_REGEX)].map(([, name]) => name));
    const availableParamNames = Object.keys(availableParameters).filter(
      (paramName) => !usedParams.has(paramName)
    );

    return availableParamNames.map((paramName) =>
      buildMapKeySuggestion(paramName, availableParameters[paramName].type, {
        filterText: `"${paramName}`,
        rangeToReplace: {
          start: innerText.length - finalWord.length,
          end: innerText.length,
        },
      })
    );
  }

  // Suggest a parameter value if on the right side of a parameter entry, capture the parameter name
  if (/:\s*"?[^"]*$/i.test(innerText)) {
    const match = innerText.match(/"([^"]+)"\s*:\s*"?[^"]*$/);
    const paramName = match ? match[1] : undefined;
    const paramConfig = paramName ? availableParameters[paramName] : undefined;

    if (paramConfig) {
      const { type, suggestions = [] } = paramConfig;
      const rangeToReplace = {
        start: innerText.length - finalWord.length,
        end: finalWord.startsWith('"') ? innerText.length + 2 : innerText.length,
      };

      const allSuggestions: ISuggestionItem[] = suggestions.map((suggestion) =>
        type === 'string'
          ? {
              ...suggestion,
              text: `"${suggestion.text}"`,
              filterText: `"${suggestion.text}"`,
              rangeToReplace,
            }
          : suggestion
      );

      const isEmptyValue = finalWord === '' || finalWord === '"';
      if (includePlaceholder && type !== 'boolean' && isEmptyValue) {
        const placeholderType = type === 'number' ? 'number' : 'value';
        allSuggestions.push(buildAddValuePlaceholder(placeholderType, { rangeToReplace }));
      }

      return allSuggestions;
    }
  }
  return [];
}

// ================================
// Map Expression Utilities
// ================================

export function getMapNestingLevel(text: string): number {
  // Ignore braces inside quoted strings and escaped braces
  const sanitized = text
    .replace(DOUBLE_QUOTED_STRING_REGEX, '')
    .replace(/\\\{/g, '')
    .replace(/\\\}/g, '');

  const openBraces = (sanitized.match(/\{/g) || []).length;
  const closeBraces = (sanitized.match(/\}/g) || []).length;

  return openBraces - closeBraces;
}

/**
 * Checks if the cursor is inside an unclosed map expression.
 */
export function isInsideMapExpression(text: string): boolean {
  return getMapNestingLevel(text) > 0;
}

/**
 * Parses a comma-separated values string and infers the type.
 * Returns suggestions for each value.
 */
export function parseMapValues(values: string[]): {
  type: MapValueType;
  suggestions: ISuggestionItem[];
} {
  if (values.length === 0) {
    return { type: 'string', suggestions: [] };
  }

  const type = inferMapValueType(values);
  const suggestions = values.map((value) => buildMapValueCompleteItem(value));

  return { type, suggestions };
}

/**
 * Infers MapValueType from an array of value strings.
 */
function inferMapValueType(values: string[]): MapValueType {
  const isBoolean = (val: string) => val.toLowerCase() === 'true' || val.toLowerCase() === 'false';
  const isNumber = (val: string) => /^-?\d+(\.\d+)?$/.test(val);

  if (values.every(isBoolean)) {
    return 'boolean';
  }

  if (values.every(isNumber)) {
    return 'number';
  }

  return 'string';
}
