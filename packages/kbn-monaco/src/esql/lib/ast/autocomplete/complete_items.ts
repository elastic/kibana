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
  TRIGGER_SUGGESTION_COMMAND,
  buildConstantsDefinitions,
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

export const getNextTokenForNot = (
  command: string,
  option: string | undefined,
  argType: string
): AutocompleteCommandDefinition[] => {
  const compatibleFunctions = builtinFunctions.filter(
    ({ name, supportedCommands, supportedOptions, ignoreAsSuggestion }) =>
      !ignoreAsSuggestion &&
      !/not_/.test(name) &&
      (option ? supportedOptions?.includes(option) : supportedCommands.includes(command))
  );
  if (argType === 'string' || argType === 'any') {
    // suggest IS, LIKE, RLIKE and TRUE/FALSE
    return compatibleFunctions
      .filter(({ name }) => name === 'like' || name === 'rlike' || name === 'in')
      .map(getAutocompleteBuiltinDefinition);
  }
  if (argType === 'boolean') {
    // suggest IS, NOT and TRUE/FALSE
    return [
      ...compatibleFunctions
        .filter(({ name }) => name === 'in')
        .map(getAutocompleteBuiltinDefinition),
      ...buildConstantsDefinitions(['true', 'false']),
    ];
  }
  return [];
};

export const getBuiltinCompatibleFunctionDefinition = (
  command: string,
  option: string | undefined,
  argType: string,
  returnTypes?: string[],
  { skipAssign }: { skipAssign?: boolean } = {}
): AutocompleteCommandDefinition[] => {
  const compatibleFunctions = builtinFunctions.filter(
    ({ name, supportedCommands, supportedOptions, signatures, ignoreAsSuggestion }) =>
      !ignoreAsSuggestion &&
      !/not_/.test(name) &&
      (!skipAssign || name !== '=') &&
      (option ? supportedOptions?.includes(option) : supportedCommands.includes(command)) &&
      signatures.some(
        ({ params }) =>
          !params.length || params.some((pArg) => pArg.type === argType || pArg.type === 'any')
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

function buildCharCompleteItem(
  label: string,
  detail: string,
  { sortText, quoted }: { sortText?: string; quoted: boolean } = { quoted: false }
): AutocompleteCommandDefinition {
  return {
    label,
    insertText: quoted ? `"${label}"` : label,
    kind: 11,
    detail,
    sortText,
  };
}
export const pipeCompleteItem = buildCharCompleteItem(
  '|',
  i18n.translate('monaco.esql.autocomplete.pipeDoc', {
    defaultMessage: 'Pipe (|)',
  }),
  { sortText: 'B', quoted: false }
);

export const commaCompleteItem = buildCharCompleteItem(
  ',',
  i18n.translate('monaco.esql.autocomplete.commaDoc', {
    defaultMessage: 'Comma (,)',
  }),
  { sortText: 'C', quoted: false }
);

export const colonCompleteItem = buildCharCompleteItem(
  ':',
  i18n.translate('monaco.esql.autocomplete.colonDoc', {
    defaultMessage: 'Colon (:)',
  }),
  { sortText: 'A', quoted: true }
);
export const semiColonCompleteItem = buildCharCompleteItem(
  ';',
  i18n.translate('monaco.esql.autocomplete.semiColonDoc', {
    defaultMessage: 'Semi colon (;)',
  }),
  { sortText: 'A', quoted: true }
);

export const listCompleteItem: AutocompleteCommandDefinition = {
  label: '( ... )',
  insertText: '( $0 )',
  insertTextRules: 4,
  kind: 11,
  detail: i18n.translate('monaco.esql.autocomplete.listDoc', {
    defaultMessage: 'List of items ( ...)',
  }),
  sortText: 'A',
  command: TRIGGER_SUGGESTION_COMMAND,
};
