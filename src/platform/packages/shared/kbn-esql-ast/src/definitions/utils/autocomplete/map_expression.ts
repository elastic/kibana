/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../commands_registry/types';
import { findFinalWord, withAutoSuggest } from './helpers';

type MapValueType = 'string' | 'number' | 'boolean' | 'map';
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
  availableParameters: MapParameters
): ISuggestionItem[] {
  const finalWord = findFinalWord(innerText);

  // Check if we're inside a nested map by counting braces
  const openBraces = (innerText.match(/\{/g) || []).length;
  const closeBraces = (innerText.match(/\}/g) || []).length;
  const nestingLevel = openBraces - closeBraces;

  // Return no suggestions if we're inside a nested map (nesting level > 1)
  if (nestingLevel > 1) {
    return [];
  }

  // Suggest a parameter entry after { or after a comma or when opening quotes after those
  if (/{\s*"?$/i.test(innerText) || /,\s*"?$/.test(innerText)) {
    const usedParams = new Set<string>();
    const regex = /"([^"]+)"\s*:/g;
    let match;
    while ((match = regex.exec(innerText)) !== null) {
      usedParams.add(match[1]);
    }

    const availableParamNames = Object.keys(availableParameters).filter(
      (paramName) => !usedParams.has(paramName)
    );

    return availableParamNames.map((paramName) => {
      const valueSnippet = SNIPPET_BY_VALUE_TYPE[availableParameters[paramName].type];
      return withAutoSuggest({
        label: paramName,
        kind: 'Constant',
        asSnippet: true,
        text: `"${paramName}": ${valueSnippet}`,
        filterText: `"${paramName}`,
        detail: paramName,
        sortText: '1',
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

    if (paramName && availableParameters[paramName]) {
      const paramType = availableParameters[paramName].type;
      return (
        availableParameters[paramName].suggestions?.map((suggestion) => {
          if (paramType === 'string') {
            return {
              ...suggestion,
              text: `"${suggestion.text}"`,
              filterText: `"${suggestion.text}"`,
              rangeToReplace: {
                start: innerText.length - finalWord.length,
                end: finalWord.startsWith('"') ? innerText.length + 2 : innerText.length, // to also replace the closing quote and avoid duplicate end quotes.
              },
            };
          } else {
            return suggestion;
          }
        }) ?? []
      );
    }
  }
  return [];
}

const SNIPPET_BY_VALUE_TYPE: Record<MapValueType, string> = {
  string: '"$0"',
  number: '',
  boolean: '',
  map: '{ $0 }',
};
