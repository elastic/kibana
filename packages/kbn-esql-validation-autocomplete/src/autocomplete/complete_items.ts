/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ItemKind, SuggestionRawDefinition } from './types';
import { builtinFunctions } from '../definitions/builtin';
import { getAllCommands } from '../shared/helpers';
import {
  getSuggestionBuiltinDefinition,
  getSuggestionCommandDefinition,
  TRIGGER_SUGGESTION_COMMAND,
  buildConstantsDefinitions,
} from './factories';
import { FunctionParameterType, FunctionReturnType } from '../definitions/types';

export function getAssignmentDefinitionCompletitionItem() {
  const assignFn = builtinFunctions.find(({ name }) => name === '=')!;
  return getSuggestionBuiltinDefinition(assignFn);
}

export const getNextTokenForNot = (
  command: string,
  option: string | undefined,
  argType: string
): SuggestionRawDefinition[] => {
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
      .map(getSuggestionBuiltinDefinition);
  }
  if (argType === 'boolean') {
    // suggest IS, NOT and TRUE/FALSE
    return [
      ...compatibleFunctions
        .filter(({ name }) => name === 'in')
        .map(getSuggestionBuiltinDefinition),
      ...buildConstantsDefinitions(['true', 'false']),
    ];
  }
  return [];
};

export const getBuiltinCompatibleFunctionDefinition = (
  command: string,
  option: string | undefined,
  argType: FunctionParameterType,
  returnTypes?: FunctionReturnType[],
  { skipAssign }: { skipAssign?: boolean } = {}
): SuggestionRawDefinition[] => {
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
    return compatibleFunctions.map(getSuggestionBuiltinDefinition);
  }
  return compatibleFunctions
    .filter((mathDefinition) =>
      mathDefinition.signatures.some(
        (signature) => returnTypes[0] === 'any' || returnTypes.includes(signature.returnType)
      )
    )
    .map(getSuggestionBuiltinDefinition);
};

export const commandAutocompleteDefinitions: SuggestionRawDefinition[] = getAllCommands()
  .filter(({ hidden }) => !hidden)
  .map(getSuggestionCommandDefinition);

function buildCharCompleteItem(
  label: string,
  detail: string,
  { sortText, quoted }: { sortText?: string; quoted: boolean } = { quoted: false }
): SuggestionRawDefinition {
  return {
    label,
    text: quoted ? `"${label}"` : label,
    kind: 'Keyword',
    detail,
    sortText,
  };
}
export const pipeCompleteItem: SuggestionRawDefinition = {
  label: '|',
  text: '| ',
  kind: 'Keyword',
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.pipeDoc', {
    defaultMessage: 'Pipe (|)',
  }),
  sortText: 'C',
  command: TRIGGER_SUGGESTION_COMMAND,
};

export const commaCompleteItem = buildCharCompleteItem(
  ',',
  i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.commaDoc', {
    defaultMessage: 'Comma (,)',
  }),
  { sortText: 'B', quoted: false }
);

export const colonCompleteItem = buildCharCompleteItem(
  ':',
  i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.colonDoc', {
    defaultMessage: 'Colon (:)',
  }),
  { sortText: 'A', quoted: true }
);
export const semiColonCompleteItem = buildCharCompleteItem(
  ';',
  i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.semiColonDoc', {
    defaultMessage: 'Semi colon (;)',
  }),
  { sortText: 'A', quoted: true }
);

export const listCompleteItem: SuggestionRawDefinition = {
  label: '( ... )',
  text: '( $0 )',
  asSnippet: true,
  kind: 'Operator',
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.listDoc', {
    defaultMessage: 'List of items ( ...)',
  }),
  sortText: 'A',
  command: TRIGGER_SUGGESTION_COMMAND,
};

export const allStarConstant: SuggestionRawDefinition = {
  label: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.allStarConstantDoc', {
    defaultMessage: 'All (*)',
  }),
  text: '*',
  kind: 'Constant' as ItemKind,
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.allStarConstantDoc', {
    defaultMessage: 'All (*)',
  }),
  sortText: '1',
};
