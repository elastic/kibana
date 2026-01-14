/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { isBuiltInStepProperty, isBuiltInStepType, type StepPropertyHandler } from '@kbn/workflows';
import type { AutocompleteContext } from '../../context/autocomplete.types';

export type GetCustomPropertySuggestionsContext = Pick<
  AutocompleteContext,
  'focusedStepInfo' | 'focusedYamlPair' | 'yamlLineCounter'
>;

export async function getCustomPropertySuggestions(
  autocompleteContext: GetCustomPropertySuggestionsContext,
  getPropertyHandler: (
    stepType: string,
    scope: 'config' | 'input',
    key: string
  ) => StepPropertyHandler | null
): Promise<monaco.languages.CompletionItem[]> {
  const { focusedStepInfo, focusedYamlPair, yamlLineCounter } = autocompleteContext;

  if (
    !focusedStepInfo ||
    !focusedStepInfo.stepType ||
    !focusedYamlPair ||
    !focusedYamlPair.valueNode?.range ||
    typeof focusedYamlPair.keyNode.value !== 'string' ||
    !yamlLineCounter ||
    // skip built-in step types like foreach, if, data.set, http, wait, etc.
    isBuiltInStepType(focusedStepInfo.stepType) ||
    // skip built-in step properties like name, type, with, etc.
    isBuiltInStepProperty(focusedYamlPair.keyNode.value)
  ) {
    return [];
  }

  // if the key is in input, it's in the with block, so path will be ['with', 'key']
  const isInInput = focusedYamlPair.path.length > 0 && focusedYamlPair.path[0] === 'with';
  const composedKey = isInInput
    ? focusedYamlPair.path.slice(1).join('.')
    : focusedYamlPair.path.join('.');
  // if the key is in config, it's on a root level, so path will be equal to the joined key path
  const isInConfig =
    focusedYamlPair.path.length > 0 && focusedYamlPair.path.join('.') === composedKey;

  if (!isInConfig && !isInInput) {
    return [];
  }

  const propertyHandler = getPropertyHandler(
    focusedStepInfo.stepType,
    isInConfig ? 'config' : 'input',
    composedKey
  );
  if (!propertyHandler || !propertyHandler.completion?.getOptions) {
    return [];
  }
  const [startOffset, endOffset] = focusedYamlPair.valueNode.range;
  const currentValue = focusedYamlPair.valueNode.value;
  const startPos = yamlLineCounter?.linePos(startOffset);
  const endPos = yamlLineCounter?.linePos(endOffset);
  // replace the whole value with the suggestion
  const replaceRange = {
    startLineNumber: startPos.line,
    startColumn: startPos.col,
    endLineNumber: endPos.line,
    endColumn: endPos.col,
  };
  const completions = await propertyHandler.completion?.getOptions(currentValue);
  return completions.map(
    (completion): monaco.languages.CompletionItem => ({
      label: completion.label,
      kind: monaco.languages.CompletionItemKind.Value,
      insertText: completion.value,
      range: replaceRange,
      detail: completion.detail,
      documentation: completion.documentation,
    })
  );
}
