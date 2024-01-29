/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { AutocompleteCommandDefinition } from './types';
import { statsAggregationFunctionDefinitions } from '../definitions/aggs';
import { builtinFunctions } from '../definitions/builtin';
import { evalFunctionsDefinitions } from '../definitions/functions';
import { getAllCommands } from '../shared/helpers';
import {
  getAutocompleteFunctionDefinition,
  getAutocompleteBuiltinDefinition,
  getAutocompleteCommandDefinition,
} from './factories';

export const mathCommandDefinition: AutocompleteCommandDefinition[] = evalFunctionsDefinitions.map(
  getAutocompleteFunctionDefinition
);

export const aggregationFunctionsDefinitions: AutocompleteCommandDefinition[] =
  statsAggregationFunctionDefinitions.map(getAutocompleteFunctionDefinition);

export function getAssignmentDefinitionCompletitionItem() {
  const assignFn = builtinFunctions.find(({ name }) => name === '=')!;
  return getAutocompleteBuiltinDefinition(assignFn);
}

export const getBuiltinCompatibleFunctionDefinition = (
  command: string,
  option: string | undefined,
  argType: string,
  returnTypes?: string[]
): AutocompleteCommandDefinition[] => {
  const compatibleFunctions = builtinFunctions.filter(
    ({ name, supportedCommands, supportedOptions, signatures, ignoreAsSuggestion }) =>
      !ignoreAsSuggestion &&
      !/not_/.test(name) &&
      (option ? supportedOptions?.includes(option) : supportedCommands.includes(command)) &&
      signatures.some(
        ({ params }) => !params.length || params.some((pArg) => pArg.type === argType)
      )
  );
  if (!returnTypes) {
    return compatibleFunctions.map(getAutocompleteBuiltinDefinition);
  }
  return compatibleFunctions
    .filter((mathDefinition) =>
      mathDefinition.signatures.some(
        (signature) => returnTypes[0] === 'any' || returnTypes.includes(signature.returnType)
      )
    )
    .map(getAutocompleteBuiltinDefinition);
};

export const commandAutocompleteDefinitions: AutocompleteCommandDefinition[] = getAllCommands().map(
  getAutocompleteCommandDefinition
);

export const pipeCompleteItem: AutocompleteCommandDefinition = {
  label: '|',
  insertText: '|',
  kind: 1,
  detail: i18n.translate('monaco.esql.autocomplete.pipeDoc', {
    defaultMessage: 'Pipe (|)',
  }),
  sortText: 'B',
};

export const commaCompleteItem: AutocompleteCommandDefinition = {
  label: ',',
  insertText: ',',
  kind: 1,
  detail: i18n.translate('monaco.esql.autocomplete.commaDoc', {
    defaultMessage: 'Comma (,)',
  }),
  sortText: 'C',
};
