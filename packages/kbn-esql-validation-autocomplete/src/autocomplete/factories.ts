/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { SuggestionRawDefinition } from './types';
import { statsAggregationFunctionDefinitions } from '../definitions/aggs';
import { evalFunctionsDefinitions } from '../definitions/functions';
import { getFunctionSignatures, getCommandSignature } from '../definitions/helpers';
import { chronoLiterals, timeLiterals } from '../definitions/literals';
import {
  FunctionDefinition,
  CommandDefinition,
  CommandOptionsDefinition,
  CommandModeDefinition,
} from '../definitions/types';
import { getCommandDefinition, shouldBeQuotedText } from '../shared/helpers';
import { buildDocumentation, buildFunctionDocumentation } from './documentation_util';
import { DOUBLE_BACKTICK, SINGLE_TICK_REGEX } from '../shared/constants';

const allFunctions = statsAggregationFunctionDefinitions.concat(evalFunctionsDefinitions);

export const TRIGGER_SUGGESTION_COMMAND = {
  title: 'Trigger Suggestion Dialog',
  id: 'editor.action.triggerSuggest',
};

function getSafeInsertText(text: string, options: { dashSupported?: boolean } = {}) {
  return shouldBeQuotedText(text, options)
    ? `\`${text.replace(SINGLE_TICK_REGEX, DOUBLE_BACKTICK)}\``
    : text;
}

export function getSuggestionFunctionDefinition(fn: FunctionDefinition): SuggestionRawDefinition {
  const fullSignatures = getFunctionSignatures(fn);
  return {
    label: fullSignatures[0].declaration,
    text: `${fn.name}($0)`,
    asSnippet: true,
    kind: 'Function',
    detail: fn.description,
    documentation: {
      value: buildFunctionDocumentation(fullSignatures),
    },
    // agg functgions have priority over everything else
    sortText: fn.type === 'agg' ? '1A' : 'C',
    // trigger a suggestion follow up on selection
    command: TRIGGER_SUGGESTION_COMMAND,
  };
}

export function getSuggestionBuiltinDefinition(fn: FunctionDefinition): SuggestionRawDefinition {
  const hasArgs = fn.signatures.some(({ params }) => params.length > 1);
  return {
    label: fn.name,
    text: hasArgs ? `${fn.name} $0` : fn.name,
    asSnippet: hasArgs,
    kind: 'Operator',
    detail: fn.description,
    documentation: {
      value: '',
    },
    sortText: 'D',
    command: hasArgs ? TRIGGER_SUGGESTION_COMMAND : undefined,
  };
}

export const getCompatibleFunctionDefinition = (
  command: string,
  option: string | undefined,
  returnTypes?: string[],
  ignored: string[] = []
): SuggestionRawDefinition[] => {
  const fnSupportedByCommand = allFunctions.filter(
    ({ name, supportedCommands, supportedOptions }) =>
      (option ? supportedOptions?.includes(option) : supportedCommands.includes(command)) &&
      !ignored.includes(name)
  );
  if (!returnTypes) {
    return fnSupportedByCommand.map(getSuggestionFunctionDefinition);
  }
  return fnSupportedByCommand
    .filter((mathDefinition) =>
      mathDefinition.signatures.some(
        (signature) => returnTypes[0] === 'any' || returnTypes.includes(signature.returnType)
      )
    )
    .map(getSuggestionFunctionDefinition);
};

export function getSuggestionCommandDefinition(
  command: CommandDefinition
): SuggestionRawDefinition {
  const commandDefinition = getCommandDefinition(command.name);
  const commandSignature = getCommandSignature(commandDefinition);
  return {
    label: commandDefinition.name,
    text: commandDefinition.signature.params.length
      ? `${commandDefinition.name} $0`
      : commandDefinition.name,
    asSnippet: true,
    kind: 'Method',
    detail: commandDefinition.description,
    documentation: {
      value: buildDocumentation(commandSignature.declaration, commandSignature.examples),
    },
    sortText: 'A',
    command: TRIGGER_SUGGESTION_COMMAND,
  };
}

export const buildFieldsDefinitions = (fields: string[]): SuggestionRawDefinition[] =>
  fields.map((label) => ({
    label,
    text: getSafeInsertText(label),
    kind: 'Variable',
    detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.fieldDefinition', {
      defaultMessage: `Field specified by the input table`,
    }),
    sortText: 'D',
  }));

export const buildVariablesDefinitions = (variables: string[]): SuggestionRawDefinition[] =>
  variables.map((label) => ({
    label,
    text: label,
    kind: 'Variable',
    detail: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.autocomplete.variableDefinition',
      {
        defaultMessage: `Variable specified by the user within the ES|QL query`,
      }
    ),
    sortText: 'D',
  }));

export const buildSourcesDefinitions = (sources: string[]): SuggestionRawDefinition[] =>
  sources.map((label) => ({
    label,
    text: getSafeInsertText(label, { dashSupported: true }),
    kind: 'Reference',
    detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.sourceDefinition', {
      defaultMessage: `Index`,
    }),
    sortText: 'A',
  }));

export const buildConstantsDefinitions = (
  userConstants: string[],
  detail?: string
): SuggestionRawDefinition[] =>
  userConstants.map((label) => ({
    label,
    text: label,
    kind: 'Constant',
    detail:
      detail ??
      i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.constantDefinition', {
        defaultMessage: `Constant`,
      }),
    sortText: 'A',
  }));

export const buildValueDefinitions = (
  values: string[],
  detail?: string
): SuggestionRawDefinition[] =>
  values.map((value) => ({
    label: `"${value}"`,
    text: `"${value}"`,
    detail:
      detail ??
      i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.valueDefinition', {
        defaultMessage: 'Literal value',
      }),
    kind: 'Value',
  }));

export const buildNewVarDefinition = (label: string): SuggestionRawDefinition => {
  return {
    label,
    text: `${label} =`,
    kind: 'Variable',
    detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.newVarDoc', {
      defaultMessage: 'Define a new variable',
    }),
    sortText: '1',
  };
};

export const buildPoliciesDefinitions = (
  policies: Array<{ name: string; sourceIndices: string[] }>
): SuggestionRawDefinition[] =>
  policies.map(({ name: label, sourceIndices }) => ({
    label,
    text: getSafeInsertText(label, { dashSupported: true }),
    kind: 'Class',
    detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.policyDefinition', {
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
): SuggestionRawDefinition[] =>
  fields.map((label) => ({
    label,
    text: label,
    kind: 'Variable',
    detail: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.autocomplete.matchingFieldDefinition',
      {
        defaultMessage: `Use to match on {matchingField} on the policy`,
        values: {
          matchingField,
        },
      }
    ),
    sortText: 'D',
  }));

export const buildOptionDefinition = (
  option: CommandOptionsDefinition,
  isAssignType: boolean = false
) => {
  const completeItem: SuggestionRawDefinition = {
    label: option.name,
    text: option.name,
    kind: 'Reference',
    detail: option.description,
    sortText: '1',
  };
  if (isAssignType || option.signature.params.length) {
    completeItem.text = isAssignType ? `${option.name} = $0` : `${option.name} $0`;
    completeItem.asSnippet = true;
    completeItem.command = TRIGGER_SUGGESTION_COMMAND;
  }
  return completeItem;
};

export const buildSettingDefinitions = (
  setting: CommandModeDefinition
): SuggestionRawDefinition[] => {
  // for now there's just a single setting with one argument
  return setting.values.map(({ name, description }) => ({
    label: `${setting.prefix || ''}${name}`,
    text: `${setting.prefix || ''}${name}:$0`,
    asSnippet: true,
    kind: 'Reference',
    detail: description ? `${setting.description} - ${description}` : setting.description,
    sortText: 'D',
    command: TRIGGER_SUGGESTION_COMMAND,
  }));
};

export const buildNoPoliciesAvailableDefinition = (): SuggestionRawDefinition => ({
  label: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.noPoliciesLabel', {
    defaultMessage: 'No available policy',
  }),
  text: '',
  kind: 'Issue',
  detail: i18n.translate(
    'kbn-esql-validation-autocomplete.esql.autocomplete.noPoliciesLabelsFound',
    {
      defaultMessage: 'Click to create',
    }
  ),
  sortText: 'D',
  command: {
    id: 'esql.policies.create',
    title: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.createNewPolicy', {
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
  const suggestions: SuggestionRawDefinition[] = [];
  if (types.includes('number')) {
    if (commandName === 'limit') {
      // suggest 10/100/1000 for limit
      suggestions.push(...buildConstantsDefinitions(['10', '100', '1000'], ''));
    }
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
        suggestions.push(
          ...buildConstantsDefinitions(
            [commandName === 'grok' ? '"%{WORD:firstWord}"' : '"%{firstWord}"'],
            i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.aPatternString', {
              defaultMessage: 'A pattern string',
            })
          )
        );
      } else {
        suggestions.push(...buildConstantsDefinitions(['string'], ''));
      }
    }
  }
  return suggestions;
}
