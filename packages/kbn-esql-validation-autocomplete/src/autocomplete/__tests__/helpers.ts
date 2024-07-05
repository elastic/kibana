/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { camelCase } from 'lodash';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import * as autocomplete from '../autocomplete';
import type { ESQLCallbacks } from '../../shared/types';
import type { EditorContext } from '../types';
import { evalFunctionDefinitions } from '../../definitions/functions';
import { builtinFunctions } from '../../definitions/builtin';
import { statsAggregationFunctionDefinitions } from '../../definitions/aggs';
import { groupingFunctionDefinitions } from '../../definitions/grouping';

interface Integration {
  name: string;
  hidden: boolean;
  title?: string;
  dataStreams: Array<{
    name: string;
    title?: string;
  }>;
}

export const triggerCharacters = [',', '(', '=', ' '];

export const fields: Array<{ name: string; type: string; suggestedAs?: string }> = [
  ...[
    'string',
    'number',
    'date',
    'boolean',
    'ip',
    'geo_point',
    'geo_shape',
    'cartesian_point',
    'cartesian_shape',
  ].map((type) => ({
    name: `${camelCase(type)}Field`,
    type,
  })),
  { name: 'any#Char$Field', type: 'number', suggestedAs: '`any#Char$Field`' },
  { name: 'kubernetes.something.something', type: 'number' },
];

export const indexes = (
  [] as Array<{ name: string; hidden: boolean; suggestedAs?: string }>
).concat(
  ['a', 'index', 'otherIndex', '.secretIndex', 'my-index'].map((name) => ({
    name,
    hidden: name.startsWith('.'),
  })),
  ['my-index[quoted]', 'my-index$', 'my_index{}'].map((name) => ({
    name,
    hidden: false,
    suggestedAs: `\`${name}\``,
  }))
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

export function createCustomCallbackMocks(
  customFields?: Array<{ name: string; type: string }>,
  customSources?: Array<{ name: string; hidden: boolean }>,
  customPolicies?: Array<{
    name: string;
    sourceIndices: string[];
    matchField: string;
    enrichFields: string[];
  }>
) {
  const finalFields = customFields || fields;
  const finalSources = customSources || indexes;
  const finalPolicies = customPolicies || policies;
  return {
    getFieldsFor: jest.fn(async () => finalFields),
    getSources: jest.fn(async () => finalSources),
    getPolicies: jest.fn(async () => finalPolicies),
  };
}

export function createSuggestContext(text: string, triggerCharacter?: string) {
  if (triggerCharacter) {
    return { triggerCharacter, triggerKind: 1 }; // any number is fine here
  }
  const foundTriggerCharIndexes = triggerCharacters.map((char) => text.lastIndexOf(char));
  const maxIndex = Math.max(...foundTriggerCharIndexes);
  return {
    triggerCharacter: text[maxIndex],
    triggerKind: 1,
  };
}

export function getPolicyFields(policyName: string) {
  return policies
    .filter(({ name }) => name === policyName)
    .flatMap(({ enrichFields }) =>
      // ok, this is a bit of cheating as it's using the same logic as in the helper
      enrichFields.map((field) => (/[^a-zA-Z\d_\.@]/.test(field) ? `\`${field}\`` : field))
    );
}

/**
 * Utility to filter down the function list for the given type
 * It is mainly driven by the return type, but it can be filtered upon with the last optional argument "paramsTypes"
 * just make sure to pass the arguments in the right order
 *
 * @param command current command context
 * @param expectedReturnType the expected type returned by the function
 * @param functionCategories
 * @param paramsTypes the function argument types (optional)
 * @returns
 */
export function getFunctionSignaturesByReturnType(
  command: string,
  _expectedReturnType: string | string[],
  {
    agg,
    grouping,
    evalMath,
    builtin,
    // skipAssign here is used to communicate to not propose an assignment if it's not possible
    // within the current context (the actual logic has it, but here we want a shortcut)
    skipAssign,
  }: {
    agg?: boolean;
    grouping?: boolean;
    evalMath?: boolean;
    builtin?: boolean;
    skipAssign?: boolean;
  } = {},
  paramsTypes?: string[],
  ignored?: string[],
  option?: string
) {
  const expectedReturnType = Array.isArray(_expectedReturnType)
    ? _expectedReturnType
    : [_expectedReturnType];

  const list = [];
  if (agg) {
    list.push(...statsAggregationFunctionDefinitions);
    // right now all grouping functions are agg functions too
    list.push(...groupingFunctionDefinitions);
  }
  if (grouping) {
    list.push(...groupingFunctionDefinitions);
  }
  // eval functions (eval is a special keyword in JS)
  if (evalMath) {
    list.push(...evalFunctionDefinitions);
  }
  if (builtin) {
    list.push(...builtinFunctions.filter(({ name }) => (skipAssign ? name !== '=' : true)));
  }

  const deduped = Array.from(new Set(list));

  return deduped
    .filter(({ signatures, ignoreAsSuggestion, supportedCommands, supportedOptions, name }) => {
      if (ignoreAsSuggestion) {
        return false;
      }
      if (!supportedCommands.includes(command) && !supportedOptions?.includes(option || '')) {
        return false;
      }
      const filteredByReturnType = signatures.filter(
        ({ returnType }) =>
          expectedReturnType.includes('any') || expectedReturnType.includes(returnType)
      );
      if (!filteredByReturnType.length) {
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
    .map(({ type, name, signatures }) => {
      if (type === 'builtin') {
        return signatures.some(({ params }) => params.length > 1)
          ? `${name.toUpperCase()} $0`
          : name.toUpperCase();
      }
      return `${name.toUpperCase()}($0)`;
    });
}

export function getFieldNamesByType(_requestedType: string | string[]) {
  const requestedType = Array.isArray(_requestedType) ? _requestedType : [_requestedType];
  return fields
    .filter(({ type }) => requestedType.includes('any') || requestedType.includes(type))
    .map(({ name, suggestedAs }) => suggestedAs || name);
}

export const setup = async (caret = '/') => {
  if (caret.length !== 1) {
    throw new Error('Caret must be a single character');
  }

  const callbacks = createCustomCallbackMocks();

  interface SuggestOptions {
    ctx?: EditorContext;
    callbacks?: ESQLCallbacks;
  }
  const suggest = async (query: string, opts: SuggestOptions = {}) => {
    const pos = query.indexOf(caret);
    if (pos < 0) throw new Error(`User cursor/caret "${caret}" not found in query: ${query}`);
    const querySansCaret = query.slice(0, pos) + query.slice(pos + 1);
    const ctx =
      opts.ctx ??
      (pos > 0 ? { triggerKind: 1, triggerCharacter: query[pos - 1] } : { triggerKind: 0 });
    return await autocomplete.suggest(
      querySansCaret,
      pos,
      ctx,
      getAstAndSyntaxErrors,
      opts.callbacks ?? callbacks
    );
  };

  const assertSuggestions = async (query: string, expected: string[], opts?: SuggestOptions) => {
    const result = await suggest(query, opts);
    const resultTexts = [...result.map((suggestion) => suggestion.text)].sort();

    expect(resultTexts).toEqual([...expected].sort());
  };

  return {
    callbacks,
    suggest,
    assertSuggestions,
  };
};
