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
  type MapValueType,
} from '../../../registry/complete_items';
import { findFinalWord } from './helpers';
import { getMapNestingLevel } from '../maps';

// Strip quoted segments so foo(bar) inside strings doesn't get picked as a function
export const DOUBLE_QUOTED_STRING_REGEX = /"([^"\\]|\\.)*"/g;
// Extracts all object keys from "key": patterns in JSON-like syntax
export const OBJECT_KEYS_REGEX = /"([^"]+)"\s*:/g;

export interface MapParameterValues {
  type: MapValueType;
  rawType?: string;
  suggestions?: ISuggestionItem[];
  description?: string;
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

    return availableParamNames.map((paramName) => {
      const { type, description } = availableParameters[paramName];
      return buildMapKeySuggestion(paramName, type, description, {
        filterText: `"${paramName}`,
        rangeToReplace: {
          start: innerText.length - finalWord.length,
          end: innerText.length,
        },
      });
    });
  }

  // Suggest a parameter value if on the right side of a parameter entry, capture the parameter name
  if (/:\s*"?[^"]*$/i.test(innerText)) {
    const match = innerText.match(/"([^"]+)"\s*:\s*"?[^"]*$/);
    const paramName = match ? match[1] : undefined;
    const paramConfig = paramName ? availableParameters[paramName] : undefined;

    if (paramConfig) {
      const { type, suggestions = [], description } = paramConfig;
      const rangeToReplace = {
        start: innerText.length - finalWord.length,
        end: finalWord.startsWith('"') ? innerText.length + 2 : innerText.length,
      };

      const allSuggestions: ISuggestionItem[] = suggestions.map((suggestion) =>
        type === 'string'
          ? {
              ...suggestion,
              detail: suggestion.detail || description,
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
