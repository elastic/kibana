/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This file contains a mechanism for injecting test functions into the
 * validation tests. This allows us to use our own fixtures without relying
 * on the generated definitions provided by Elasticsearch.
 */
import {
  ESQLUserDefinedColumn,
  ESQLFieldWithMetadata,
  ICommandCallbacks,
  ISuggestionItem,
  getLocationFromCommandOrOptionName,
  Location,
} from '../commands_registry/types';
import { aggFunctionDefinitions } from '../definitions/generated/aggregation_functions';
import { groupingFunctionDefinitions } from '../definitions/generated/grouping_functions';
import { scalarFunctionDefinitions } from '../definitions/generated/scalar_functions';
import { operatorsDefinitions } from '../definitions/all_operators';
import { parse } from '../parser';
import type { ESQLCommand } from '../types';
import {
  FieldType,
  FunctionDefinitionTypes,
  FunctionParameterType,
  FunctionReturnType,
  SupportedDataType,
} from '../definitions/types';
import { mockContext } from './context_fixtures';
import { getSafeInsertText } from '../definitions/utils';
import { timeUnitsToSuggest } from '../definitions/constants';
import { correctQuerySyntax, findAstPosition } from '../definitions/utils/ast';

export const expectSuggestions = async (
  query: string,
  expectedSuggestions: string[],
  context = mockContext,
  commandName: string,
  mockCallbacks: ICommandCallbacks = {},
  autocomplete: (
    arg0: string,
    arg1: ESQLCommand,
    arg2: ICommandCallbacks,
    arg3: {
      userDefinedColumns: Map<string, ESQLUserDefinedColumn[]>;
      fields: Map<string, ESQLFieldWithMetadata>;
    },
    arg4?: number
  ) => Promise<ISuggestionItem[]>,
  offset?: number
) => {
  const correctedQuery = correctQuerySyntax(query);
  const { ast } = parse(correctedQuery, { withFormatting: true });
  const cursorPosition = offset ?? query.length;
  const { command } = findAstPosition(ast, cursorPosition);
  if (!command) {
    throw new Error(`${commandName.toUpperCase()} command not found in the parsed query`);
  }
  const result = await autocomplete(query, command, mockCallbacks, context, cursorPosition);

  const suggestions: string[] = [];
  result.forEach((suggestion) => {
    suggestions.push(suggestion.text);
  });
  expect(suggestions.sort()).toEqual(expectedSuggestions.sort());
};

export function getFieldNamesByType(
  _requestedType: Readonly<FieldType | 'any' | Array<FieldType | 'any'>>,
  excludeUserDefined: boolean = false
) {
  const fieldsMap = mockContext.fields;
  const userDefinedColumnsMap = mockContext.userDefinedColumns;
  const fields = Array.from(fieldsMap.values());
  const userDefinedColumns = Array.from(userDefinedColumnsMap.values()).flat();
  const requestedType = Array.isArray(_requestedType) ? _requestedType : [_requestedType];
  const finalArray = excludeUserDefined ? fields : [...fields, ...userDefinedColumns];
  return finalArray
    .filter(
      ({ type }) =>
        (requestedType.includes('any') || requestedType.includes(type)) && type !== 'unsupported'
    )
    .map(({ name }) => name);
}

export function getPolicyFields(policyName: string) {
  const policiesMap =
    mockContext.policies ?? new Map<string, { enrichFields: string[]; name: string }>();
  const policies = Array.from(policiesMap.values());
  return policies
    .filter(({ name }) => name === policyName)
    .flatMap(({ enrichFields }) => enrichFields.map((field) => getSafeInsertText(field)));
}

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
  location: Location | Location[],
  _expectedReturnType: Readonly<FunctionReturnType | 'any' | Array<FunctionReturnType | 'any'>>,
  {
    agg,
    grouping,
    scalar,
    operators,
    // skipAssign here is used to communicate to not propose an assignment if it's not possible
    // within the current context (the actual logic has it, but here we want a shortcut)
    skipAssign,
  }: {
    agg?: boolean;
    grouping?: boolean;
    scalar?: boolean;
    operators?: boolean;
    skipAssign?: boolean;
  } = {},
  paramsTypes?: Readonly<FunctionParameterType[]>,
  ignored?: string[],
  option?: string
) {
  const expectedReturnType = Array.isArray(_expectedReturnType)
    ? _expectedReturnType
    : [_expectedReturnType];

  const list = [];
  if (agg) {
    list.push(...aggFunctionDefinitions);
  }
  if (grouping) {
    list.push(...groupingFunctionDefinitions);
  }
  // eval functions (eval is a special keyword in JS)
  if (scalar) {
    list.push(...scalarFunctionDefinitions);
  }
  if (operators) {
    list.push(...operatorsDefinitions.filter(({ name }) => (skipAssign ? name !== '=' : true)));
  }

  const deduped = Array.from(new Set(list));

  const locations = Array.isArray(location) ? location : [location];

  return deduped
    .filter(({ signatures, ignoreAsSuggestion, locationsAvailable }) => {
      if (ignoreAsSuggestion) {
        return false;
      }
      if (
        !(option ? [...locations, getLocationFromCommandOrOptionName(option)] : locations).some(
          (loc) => locationsAvailable.includes(loc)
        )
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
    .map((definition) => {
      const { type, name, signatures, customParametersSnippet } = definition;

      if (type === FunctionDefinitionTypes.OPERATOR) {
        return signatures.some(({ params }) => params.length > 1)
          ? `${name.toUpperCase()} $0`
          : name.toUpperCase();
      }
      return customParametersSnippet
        ? `${name.toUpperCase()}(${customParametersSnippet})`
        : `${name.toUpperCase()}($0)`;
    });
}

export function getLiteralsByType(_type: SupportedDataType | SupportedDataType[]) {
  const type = Array.isArray(_type) ? _type : [_type];
  if (type.includes('time_duration')) {
    // return only singular
    return timeUnitsToSuggest.map(({ name }) => `1 ${name}`).filter((s) => !/s$/.test(s));
  }
  return [];
}
