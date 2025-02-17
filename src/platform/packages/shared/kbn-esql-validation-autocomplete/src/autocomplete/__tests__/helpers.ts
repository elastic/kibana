/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { camelCase } from 'lodash';
import { parse } from '@kbn/esql-ast';
import { scalarFunctionDefinitions } from '../../definitions/generated/scalar_functions';
import { builtinFunctions } from '../../definitions/builtin';
import { NOT_SUGGESTED_TYPES } from '../../shared/resources_helpers';
import { aggregationFunctionDefinitions } from '../../definitions/generated/aggregation_functions';
import { timeUnitsToSuggest } from '../../definitions/literals';
import { groupingFunctionDefinitions } from '../../definitions/generated/grouping_functions';
import * as autocomplete from '../autocomplete';
import type { ESQLCallbacks } from '../../shared/types';
import type { EditorContext, SuggestionRawDefinition } from '../types';
import { TIME_SYSTEM_PARAMS, TRIGGER_SUGGESTION_COMMAND, getSafeInsertText } from '../factories';
import { ESQLRealField } from '../../validation/types';
import {
  FieldType,
  fieldTypes,
  FunctionParameterType,
  FunctionReturnType,
  SupportedDataType,
} from '../../definitions/types';
import { joinIndices } from '../../__tests__/helpers';

export interface Integration {
  name: string;
  hidden: boolean;
  title?: string;
  dataStreams: Array<{
    name: string;
    title?: string;
  }>;
}

export type PartialSuggestionWithText = Partial<SuggestionRawDefinition> & { text: string };

export const TIME_PICKER_SUGGESTION: PartialSuggestionWithText = {
  text: '',
  label: 'Choose from the time picker',
};

export const triggerCharacters = [',', '(', '=', ' '];

export type TestField = ESQLRealField & { suggestedAs?: string };

export const fields: TestField[] = [
  ...fieldTypes.map((type) => ({
    name: `${camelCase(type)}Field`,
    type,
  })),
  { name: 'any#Char$Field', type: 'double', suggestedAs: '`any#Char$Field`' },
  { name: 'kubernetes.something.something', type: 'double' },
];

export const lookupIndexFields: TestField[] = [
  { name: 'booleanField', type: 'boolean' },
  { name: 'dateField', type: 'date' },
  { name: 'joinIndexOnlyField', type: 'text' },
];

export const indexes = (
  [] as Array<{ name: string; hidden: boolean; suggestedAs?: string }>
).concat(
  [
    'a',
    'index',
    'otherIndex',
    '.secretIndex',
    'my-index',
    'my-index$',
    'my_index{}',
    'my-index+1',
    'synthetics-*',
  ].map((name) => ({
    name,
    hidden: name.startsWith('.'),
  })),
  ['my-index[quoted]', 'my:index', 'my,index', 'logstash-{now/d{yyyy.MM.dd|+12:00}}'].map(
    (name) => ({
      name,
      hidden: false,
      suggestedAs: `"${name}"`,
    })
  )
);

export const integrations: Integration[] = ['nginx', 'k8s'].map((name) => ({
  name,
  hidden: false,
  title: `integration-${name}`,
  dataStreams: [
    {
      name: `${name}-1`,
      title: `integration-${name}-1`,
    },
  ],
}));

export const policies = [
  {
    name: 'policy',
    sourceIndices: ['enrichIndex1'],
    matchField: 'otherStringField',
    enrichFields: ['otherField', 'yetAnotherField', 'yet-special-field'],
    suggestedAs: undefined,
  },
  ...['my-policy[quoted]', 'my-policy$', 'my_policy{}'].map((name) => ({
    name,
    sourceIndices: ['enrichIndex1'],
    matchField: 'otherStringField',
    enrichFields: ['otherField', 'yetAnotherField', 'yet-special-field'],
    suggestedAs: `\`${name}\``,
  })),
];

/**
 * Utility to filter down the function list for the given type
 * It is mainly driven by the return type, but it can be filtered upon with the last optional argument "paramsTypes"
 * just make sure to pass the arguments in the right order
 * @param command current command context
 * @param expectedReturnType the expected type returned by the function
 * @param functionCategories
 * @param paramsTypes the function argument types (optional)
 * @returns
 */
export function getFunctionSignaturesByReturnType(
  command: string | string[],
  _expectedReturnType: Readonly<FunctionReturnType | 'any' | Array<FunctionReturnType | 'any'>>,
  {
    agg,
    grouping,
    scalar,
    builtin,
    // skipAssign here is used to communicate to not propose an assignment if it's not possible
    // within the current context (the actual logic has it, but here we want a shortcut)
    skipAssign,
  }: {
    agg?: boolean;
    grouping?: boolean;
    scalar?: boolean;
    builtin?: boolean;
    skipAssign?: boolean;
  } = {},
  paramsTypes?: Readonly<FunctionParameterType[]>,
  ignored?: string[],
  option?: string
): PartialSuggestionWithText[] {
  const expectedReturnType = Array.isArray(_expectedReturnType)
    ? _expectedReturnType
    : [_expectedReturnType];

  const list = [];
  if (agg) {
    list.push(...aggregationFunctionDefinitions);
  }
  if (grouping) {
    list.push(...groupingFunctionDefinitions);
  }
  // eval functions (eval is a special keyword in JS)
  if (scalar) {
    list.push(...scalarFunctionDefinitions);
  }
  if (builtin) {
    list.push(...builtinFunctions.filter(({ name }) => (skipAssign ? name !== '=' : true)));
  }

  const deduped = Array.from(new Set(list));

  const commands = Array.isArray(command) ? command : [command];
  return deduped
    .filter(({ signatures, ignoreAsSuggestion, supportedCommands, supportedOptions, name }) => {
      if (ignoreAsSuggestion) {
        return false;
      }
      if (
        !commands.some((c) => supportedCommands.includes(c)) &&
        !supportedOptions?.includes(option || '')
      ) {
        return false;
      }
      const filteredByReturnType = signatures.filter(
        ({ returnType }) =>
          expectedReturnType.includes('any') || expectedReturnType.includes(returnType as string)
      );
      if (!filteredByReturnType.length && !expectedReturnType.includes('any')) {
        return false;
      }
      if (paramsTypes?.length) {
        return filteredByReturnType.some(
          ({ params }) =>
            !params.length ||
            (paramsTypes.length <= params.length &&
              paramsTypes.every(
                (expectedType, i) =>
                  expectedType === 'any' ||
                  params[i].type === 'any' ||
                  expectedType === params[i].type
              ))
        );
      }
      return true;
    })
    .filter(({ name }) => {
      if (ignored?.length) {
        return !ignored?.includes(name);
      }
      return true;
    })
    .sort(({ name: a }, { name: b }) => a.localeCompare(b))
    .map<PartialSuggestionWithText>((definition) => {
      const { type, name, signatures } = definition;

      if (type === 'builtin') {
        return {
          text: signatures.some(({ params }) => params.length > 1)
            ? `${name.toUpperCase()} $0`
            : name.toUpperCase(),
          label: name.toUpperCase(),
        };
      }
      return {
        text: `${name.toUpperCase()}($0)`,
        label: name.toUpperCase(),
      };
    });
}

export function getFieldNamesByType(
  _requestedType: Readonly<FieldType | 'any' | Array<FieldType | 'any'>>
) {
  const requestedType = Array.isArray(_requestedType) ? _requestedType : [_requestedType];
  return fields
    .filter(
      ({ type }) =>
        (requestedType.includes('any') || requestedType.includes(type)) &&
        !NOT_SUGGESTED_TYPES.includes(type)
    )
    .map(({ name, suggestedAs }) => suggestedAs || name);
}

export function getLiteralsByType(_type: SupportedDataType | SupportedDataType[]) {
  const type = Array.isArray(_type) ? _type : [_type];
  if (type.includes('time_literal')) {
    // return only singular
    return timeUnitsToSuggest.map(({ name }) => `1 ${name}`).filter((s) => !/s$/.test(s));
  }
  return [];
}

export function getDateLiteralsByFieldType(_requestedType: FieldType | FieldType[]) {
  const requestedType = Array.isArray(_requestedType) ? _requestedType : [_requestedType];
  return requestedType.includes('date') ? [TIME_PICKER_SUGGESTION, ...TIME_SYSTEM_PARAMS] : [];
}

export function createCustomCallbackMocks(
  /**
   * Columns that will come from Elasticsearch since the last command
   * e.g. the test case may be `FROM index | EVAL foo = 1 | KEEP /`
   *
   * In this case, the columns available for the KEEP command will be the ones
   * that were available after the EVAL command
   *
   * `FROM index | EVAL foo = 1 | LIMIT 0` will be used to fetch columns. The response
   * will include "foo" as a column.
   */
  customColumnsSinceLastCommand?: ESQLRealField[],
  customSources?: Array<{ name: string; hidden: boolean }>,
  customPolicies?: Array<{
    name: string;
    sourceIndices: string[];
    matchField: string;
    enrichFields: string[];
  }>
) {
  const finalColumnsSinceLastCommand =
    customColumnsSinceLastCommand ||
    fields.filter(({ type }) => !NOT_SUGGESTED_TYPES.includes(type));
  const finalSources = customSources || indexes;
  const finalPolicies = customPolicies || policies;
  return {
    getColumnsFor: jest.fn(async ({ query }) => {
      if (query === 'FROM join_index') {
        return lookupIndexFields;
      }

      return finalColumnsSinceLastCommand;
    }),
    getSources: jest.fn(async () => finalSources),
    getPolicies: jest.fn(async () => finalPolicies),
    getJoinIndices: jest.fn(async () => ({ indices: joinIndices })),
  };
}

export function createCompletionContext(triggerCharacter?: string) {
  if (triggerCharacter) {
    return { triggerCharacter, triggerKind: 1 }; // any number is fine here
  }
  return {
    triggerKind: 0,
  };
}

export function getPolicyFields(policyName: string) {
  return policies
    .filter(({ name }) => name === policyName)
    .flatMap(({ enrichFields }) => enrichFields.map((field) => getSafeInsertText(field)));
}

export interface SuggestOptions {
  triggerCharacter?: string;
  callbacks?: ESQLCallbacks;
}

export const setup = async (caret = '/') => {
  if (caret.length !== 1) {
    throw new Error('Caret must be a single character');
  }

  const callbacks = createCustomCallbackMocks();

  const suggest = async (query: string, opts: SuggestOptions = {}) => {
    const pos = query.indexOf(caret);
    if (pos < 0) throw new Error(`User cursor/caret "${caret}" not found in query: ${query}`);
    const querySansCaret = query.slice(0, pos) + query.slice(pos + 1);
    const ctx: EditorContext = opts.triggerCharacter
      ? { triggerKind: 1, triggerCharacter: opts.triggerCharacter }
      : { triggerKind: 0 };

    return await autocomplete.suggest(
      querySansCaret,
      pos,
      ctx,
      (_query: string | undefined) => parse(_query, { withFormatting: true }),
      opts.callbacks ?? callbacks
    );
  };

  const assertSuggestions = async (
    query: string,
    expected: Array<string | PartialSuggestionWithText>,
    opts?: SuggestOptions
  ) => {
    try {
      const result = await suggest(query, opts);
      const resultTexts = [...result.map((suggestion) => suggestion.text)].sort();

      const expectedTexts = expected
        .map((suggestion) => (typeof suggestion === 'string' ? suggestion : suggestion.text ?? ''))
        .sort();

      expect(resultTexts).toEqual(expectedTexts);

      const expectedNonStringSuggestions = expected.filter(
        (suggestion) => typeof suggestion !== 'string'
      ) as PartialSuggestionWithText[];

      for (const expectedSuggestion of expectedNonStringSuggestions) {
        const suggestion = result.find((s) => s.text === expectedSuggestion.text);
        expect(suggestion).toEqual(expect.objectContaining(expectedSuggestion));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed query\n-------------\n${query}`);
      throw error;
    }
  };

  return {
    callbacks,
    suggest,
    assertSuggestions,
  };
};

/**
 * Attaches the trigger command to an expected suggestion to make
 * sure the suggestions menu will be opened when the suggestion is accepted.
 */
export const attachTriggerCommand = (
  s: string | PartialSuggestionWithText
): PartialSuggestionWithText =>
  typeof s === 'string'
    ? {
        text: s,
        command: TRIGGER_SUGGESTION_COMMAND,
      }
    : { ...s, command: TRIGGER_SUGGESTION_COMMAND };
