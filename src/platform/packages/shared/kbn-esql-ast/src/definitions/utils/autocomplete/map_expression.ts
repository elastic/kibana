/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../commands_registry/types';
import { withAutoSuggest } from './helpers';

/**
 * This function provides suggestions for map expressions within a command.
 *
 * You must provide a record of available entries, where each key is a parameter name and the value is an
 * array of suggestions for that parameter.
 *
 * Examples:
 *  | COMPLETION "prompt" WITH {                    ---> suggests parameters names
 *  | COMPLETION "prompt" WITH { "param1": "        ---> suggests parameter values
 *  | COMPLETION "prompt" WITH { "param1": "value", ---> suggests parameter names that were not used
 *
 * This helper does not suggest enclosing brackets.
 *
 * @param innerText
 * @param availableParameters
 */
export function getCommandMapExpressionSuggestions(
  innerText: string,
  availableParameters: Record<string, ISuggestionItem[]>
): ISuggestionItem[] {
  // Suggest a parameter entry after { or after a comma
  if (/{\s*$/i.test(innerText) || /,\s*$/.test(innerText)) {
    const usedParams = new Set<string>();
    const regex = /"([^"]+)"\s*:/g;
    let match;
    while ((match = regex.exec(innerText)) !== null) {
      usedParams.add(match[1]);
    }

    const availableParamNames = Object.keys(availableParameters).filter(
      (paramName) => !usedParams.has(paramName)
    );

    return availableParamNames.map((paramName) =>
      withAutoSuggest({
        label: paramName,
        kind: 'Constant',
        asSnippet: true,
        text: `"${paramName}": "$0"`,
        detail: paramName,
        sortText: '1',
      })
    );
  }

  // Suggest a parameter value if on the right side of a parameter entry, capture the parameter name
  if (/:\s*"[^"]*$/i.test(innerText)) {
    const match = innerText.match(/"([^"]+)"\s*:\s*"[^"]*$/);
    const paramName = match ? match[1] : undefined;
    if (paramName && availableParameters[paramName]) {
      return availableParameters[paramName];
    }
  }
  return [];
}
