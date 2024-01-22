/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { AutocompleteCommandDefinition } from './types';
import { statsAggregationFunctionDefinitions } from '../definitions/aggs';
import { evalFunctionsDefinitions } from '../definitions/functions';
import { getFunctionSignatures, getCommandSignature } from '../definitions/helpers';
import { chronoLiterals, timeLiterals } from '../definitions/literals';
import {
  FunctionDefinition,
  CommandDefinition,
  CommandOptionsDefinition,
} from '../definitions/types';
import { getCommandDefinition } from '../shared/helpers';
import { buildDocumentation, buildFunctionDocumentation } from './documentation_util';

const allFunctions = statsAggregationFunctionDefinitions.concat(evalFunctionsDefinitions);

export const TRIGGER_SUGGESTION_COMMAND = {
  title: 'Trigger Suggestion Dialog',
  id: 'editor.action.triggerSuggest',
};

function getSafeInsertText(text: string, { dashSupported }: { dashSupported?: boolean } = {}) {
  if (dashSupported) {
    return /[^a-zA-Z\d_\.@-]/.test(text) ? `\`${text}\`` : text;
  }
  return /[^a-zA-Z\d_\.@]/.test(text) ? `\`${text}\`` : text;
}

export function getAutocompleteFunctionDefinition(fn: FunctionDefinition) {
  const fullSignatures = getFunctionSignatures(fn);
  return {
    label: fullSignatures[0].declaration,
    insertText: `${fn.name}($0)`,
    insertTextRules: 4, // monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: 1,
    detail: fn.description,
    documentation: {
      value: buildFunctionDocumentation(fullSignatures),
    },
    sortText: 'C',
  };
}

export function getAutocompleteBuiltinDefinition(fn: FunctionDefinition) {
  return {
    label: fn.name,
    insertText: `${fn.name} $0`,
    insertTextRules: 4, // monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: 11,
    detail: fn.description,
    documentation: {
      value: '',
    },
    sortText: 'D',
    command: TRIGGER_SUGGESTION_COMMAND,
  };
}

export const isCompatibleFunctionName = (fnName: string, command: string) => {
  const fnSupportedByCommand = allFunctions.filter(({ supportedCommands }) =>
    supportedCommands.includes(command)
  );
  return fnSupportedByCommand.some(({ name }) => name === fnName);
};

export const getCompatibleFunctionDefinition = (
  command: string,
  returnTypes?: string[],
  ignored: string[] = []
): AutocompleteCommandDefinition[] => {
  const fnSupportedByCommand = allFunctions.filter(
    ({ name, supportedCommands }) => supportedCommands.includes(command) && !ignored.includes(name)
  );
  if (!returnTypes) {
    return fnSupportedByCommand.map(getAutocompleteFunctionDefinition);
  }
  return fnSupportedByCommand
    .filter((mathDefinition) =>
      mathDefinition.signatures.some(
        (signature) => returnTypes[0] === 'any' || returnTypes.includes(signature.returnType)
      )
    )
    .map(getAutocompleteFunctionDefinition);
};

export function getAutocompleteCommandDefinition(
  command: CommandDefinition
): AutocompleteCommandDefinition {
  const commandDefinition = getCommandDefinition(command.name);
  const commandSignature = getCommandSignature(commandDefinition);
  return {
    label: commandDefinition.name,
    insertText: commandDefinition.name,
    kind: 0,
    detail: commandDefinition.description,
    documentation: {
      value: buildDocumentation(commandSignature.declaration, commandSignature.examples),
    },
    sortText: 'A',
  };
}

export const buildFieldsDefinitions = (fields: string[]): AutocompleteCommandDefinition[] =>
  fields.map((label) => ({
    label,
    insertText: getSafeInsertText(label),
    kind: 4,
    detail: i18n.translate('monaco.esql.autocomplete.fieldDefinition', {
      defaultMessage: `Field specified by the input table`,
    }),
    sortText: 'D',
  }));

export const buildVariablesDefinitions = (variables: string[]): AutocompleteCommandDefinition[] =>
  variables.map((label) => ({
    label,
    insertText: getSafeInsertText(label),
    kind: 4,
    detail: i18n.translate('monaco.esql.autocomplete.variableDefinition', {
      defaultMessage: `Variable specified by the user within the ES|QL query`,
    }),
    sortText: 'D',
  }));

export const buildSourcesDefinitions = (sources: string[]): AutocompleteCommandDefinition[] =>
  sources.map((label) => ({
    label,
    insertText: getSafeInsertText(label, { dashSupported: true }),
    kind: 21,
    detail: i18n.translate('monaco.esql.autocomplete.sourceDefinition', {
      defaultMessage: `Input table`,
    }),
    sortText: 'A',
  }));

export const buildConstantsDefinitions = (
  userConstants: string[],
  detail?: string
): AutocompleteCommandDefinition[] =>
  userConstants.map((label) => ({
    label,
    insertText: label,
    kind: 14,
    detail:
      detail ??
      i18n.translate('monaco.esql.autocomplete.constantDefinition', {
        defaultMessage: `User defined variable`,
      }),
    sortText: 'A',
  }));

export const buildNewVarDefinition = (label: string): AutocompleteCommandDefinition => {
  return {
    label,
    insertText: `${label} =`,
    kind: 21,
    detail: i18n.translate('monaco.esql.autocomplete.newVarDoc', {
      defaultMessage: 'Define a new variable',
    }),
    sortText: '1',
  };
};

export const buildPoliciesDefinitions = (
  policies: Array<{ name: string; sourceIndices: string[] }>
): AutocompleteCommandDefinition[] =>
  policies.map(({ name: label, sourceIndices }) => ({
    label,
    insertText: getSafeInsertText(label, { dashSupported: true }),
    kind: 5,
    detail: i18n.translate('monaco.esql.autocomplete.policyDefinition', {
      defaultMessage: `Policy defined on {count, plural, one {index} other {indices}}: {indices}`,
      values: {
        count: sourceIndices.length,
        indices: sourceIndices.join(', '),
      },
    }),
    sortText: 'D',
  }));

export const buildMatchingFieldsDefinition = (
  matchingField: string,
  fields: string[]
): AutocompleteCommandDefinition[] =>
  fields.map((label) => ({
    label,
    insertText: label,
    kind: 4,
    detail: i18n.translate('monaco.esql.autocomplete.matchingFieldDefinition', {
      defaultMessage: `Use to match on {matchingField} on the policy`,
      values: {
        matchingField,
      },
    }),
    sortText: 'D',
  }));

export const buildOptionDefinition = (option: CommandOptionsDefinition) => {
  const completeItem: AutocompleteCommandDefinition = {
    label: option.name,
    insertText: option.name,
    kind: 21,
    detail: option.description,
    sortText: 'D',
  };
  if (option.wrapped) {
    completeItem.insertText = `${option.wrapped[0]}${option.name} $0 ${option.wrapped[1]}`;
    completeItem.insertTextRules = 4; // monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
  }
  return completeItem;
};

export const buildNoPoliciesAvailableDefinition = (): AutocompleteCommandDefinition => ({
  label: i18n.translate('monaco.esql.autocomplete.noPoliciesLabel', {
    defaultMessage: 'No available policy',
  }),
  insertText: '',
  kind: 26,
  detail: i18n.translate('monaco.esql.autocomplete.noPoliciesLabelsFound', {
    defaultMessage: 'Click to create',
  }),
  sortText: 'D',
  command: {
    id: 'esql.policies.create',
    title: i18n.translate('monaco.esql.autocomplete.createNewPolicy', {
      defaultMessage: 'Click to create',
    }),
  },
});

function getUnitDuration(unit: number = 1) {
  const filteredTimeLiteral = timeLiterals.filter(({ name }) => {
    const result = /s$/.test(name);
    return unit > 1 ? result : !result;
  });
  return filteredTimeLiteral.map(({ name }) => `${unit} ${name}`);
}

export function getCompatibleLiterals(commandName: string, types: string[], names?: string[]) {
  const suggestions: AutocompleteCommandDefinition[] = [];
  if (types.includes('number') && commandName === 'limit') {
    // suggest 10/50/100
    suggestions.push(...buildConstantsDefinitions(['10', '100', '1000'], ''));
  }
  if (types.includes('time_literal')) {
    // filter plural for now and suggest only unit + singular
    suggestions.push(...buildConstantsDefinitions(getUnitDuration(1))); // i.e. 1 year
  }
  // this is a special type built from the suggestion system, not inherited from the AST
  if (types.includes('time_literal_unit')) {
    suggestions.push(...buildConstantsDefinitions(timeLiterals.map(({ name }) => name))); // i.e. year, month, ...
  }
  if (types.includes('chrono_literal')) {
    suggestions.push(...buildConstantsDefinitions(chronoLiterals.map(({ name }) => name))); // i.e. EPOC_DAY, ...
  }
  if (types.includes('string')) {
    if (names) {
      const index = types.indexOf('string');
      if (/pattern/.test(names[index])) {
        suggestions.push(...buildConstantsDefinitions(['"a-pattern"'], 'A pattern string'));
      } else {
        suggestions.push(...buildConstantsDefinitions(['string'], ''));
      }
    }
  }
  return suggestions;
}
