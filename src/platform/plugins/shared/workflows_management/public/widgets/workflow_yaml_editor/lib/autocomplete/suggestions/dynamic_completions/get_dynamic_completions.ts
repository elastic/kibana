/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { stepSchemas } from '../../../../../../../common/step_schemas';
import type { AutocompleteContext } from '../../context/autocomplete.types';

export async function getDynamicCompletions(
  autocompleteContext: AutocompleteContext
): Promise<monaco.languages.CompletionItem[]> {
  const { focusedStepInfo, focusedYamlPair } = autocompleteContext;

  if (!focusedStepInfo || !focusedStepInfo.stepType || !focusedYamlPair) {
    return [];
  }

  const completionFnRecord = stepSchemas
    .getAllConnectorsMapCache()
    ?.get(focusedStepInfo.stepType)?.completions;
  if (!completionFnRecord) {
    return [];
  }

  const key = focusedYamlPair.keyNode.value as string;
  const isInConfig = focusedYamlPair.path.length > 1 && focusedYamlPair.path[0] === 'config';
  const completionFn = isInConfig
    ? completionFnRecord.config?.[key]
    : completionFnRecord.input?.[key];
  if (!completionFn) {
    return [];
  }
  const completions = await completionFn();
  return completions.map((completion) => ({
    label: completion.label,
    value: completion.value,
    kind: monaco.languages.CompletionItemKind.Value,
    insertText: completion.value,
    range: autocompleteContext.range,
  }));
}
