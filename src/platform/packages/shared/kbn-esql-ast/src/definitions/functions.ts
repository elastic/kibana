/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { memoize } from 'lodash';
import {
  type FunctionDefinition,
  type FunctionFilterPredicates,
  type FunctionParameterType,
  FunctionDefinitionTypes,
} from './types';
import { operatorsDefinitions } from './all_operators';
import { aggFunctionDefinitions } from './generated/aggregation_functions';
import { groupingFunctionDefinitions } from './generated/grouping_functions';
import { scalarFunctionDefinitions } from './generated/scalar_functions';
import { ISuggestionItem } from '../commands_registry/types';
import { TRIGGER_SUGGESTION_COMMAND } from '../commands_registry/constants';
import { buildFunctionDocumentation } from './documentation_util';

const techPreviewLabel = i18n.translate(
  'kbn-esql-validation-autocomplete.esql.autocomplete.techPreviewLabel',
  {
    defaultMessage: `Technical Preview`,
  }
);

let fnLookups: Map<string, FunctionDefinition> | undefined;

function buildFunctionLookup() {
  // we always refresh if we have test functions
  if (!fnLookups) {
    fnLookups = operatorsDefinitions
      .concat(scalarFunctionDefinitions, aggFunctionDefinitions, groupingFunctionDefinitions)
      .reduce((memo, def) => {
        memo.set(def.name, def);
        if (def.alias) {
          for (const alias of def.alias) {
            memo.set(alias, def);
          }
        }
        return memo;
      }, new Map<string, FunctionDefinition>());
  }
  return fnLookups;
}

export function getFunctionDefinition(name: string) {
  return buildFunctionLookup().get(name.toLowerCase());
}

export const filterFunctionDefinitions = (
  functions: FunctionDefinition[],
  predicates: FunctionFilterPredicates | undefined
): FunctionDefinition[] => {
  if (!predicates) {
    return functions;
  }
  const { location, returnTypes, ignored = [] } = predicates;

  return functions.filter(({ name, locationsAvailable, ignoreAsSuggestion, signatures }) => {
    if (ignoreAsSuggestion) {
      return false;
    }

    if (ignored.includes(name)) {
      return false;
    }

    if (location && !locationsAvailable.includes(location)) {
      return false;
    }

    if (returnTypes && !returnTypes.includes('any')) {
      return signatures.some((signature) => returnTypes.includes(signature.returnType as string));
    }

    return true;
  });
};

export function printArguments(
  {
    name,
    type,
    optional,
  }: {
    name: string;
    type: FunctionParameterType | FunctionParameterType[];
    optional?: boolean;
  },
  withTypes: boolean
): string {
  if (!withTypes) {
    return name;
  }
  return `${name}${optional ? ':?' : ':'} ${Array.isArray(type) ? type.join(' | ') : type}`;
}

function handleAdditionalArgs(
  criteria: boolean,
  additionalArgs: Array<{
    name: string;
    type: FunctionParameterType | FunctionParameterType[];
    optional?: boolean;
    reference?: string;
  }>,
  withTypes: boolean
) {
  return criteria
    ? `${withTypes ? ' ,[... ' : ', '}${additionalArgs
        .map((arg) => printArguments(arg, withTypes))
        .join(', ')}${withTypes ? ']' : ''}`
    : '';
}

/**
 * Given a function definition, this function will return a list of function signatures
 *
 * If withTypes is true, the function will return a formal function definition with all arguments typed.
 * This is used when generating the function signature for the monaco editor. If withTypes is false, you get
 * an "injectable" version of the signature to be used to generate test cases.
 */
export function getFunctionSignatures(
  { name, signatures }: FunctionDefinition,
  { withTypes, capitalize }: { withTypes: boolean; capitalize?: boolean } = {
    withTypes: true,
    capitalize: false,
  }
) {
  return signatures.map(({ params, returnType, minParams }) => {
    // for functions with a minimum number of args, repeat the last arg multiple times
    // just make sure to compute the right number of args to add
    const minParamsToAdd = Math.max((minParams || 0) - params.length, 0);
    const extraArg = Array(minParamsToAdd || 1).fill(params[Math.max(params.length - 1, 0)]);
    return {
      declaration: `${capitalize ? name.toUpperCase() : name}(${params
        .map((arg) => printArguments(arg, withTypes))
        .join(', ')}${handleAdditionalArgs(minParamsToAdd > 0, extraArg, withTypes)})${
        withTypes ? `: ${returnType}` : ''
      }`,
    };
  });
}

const allFunctions = memoize(
  () =>
    aggFunctionDefinitions.concat(scalarFunctionDefinitions).concat(groupingFunctionDefinitions),
  () => []
);

export function getFunctionSuggestion(fn: FunctionDefinition): ISuggestionItem {
  let detail = fn.description;
  if (fn.preview) {
    detail = `[${techPreviewLabel}] ${detail}`;
  }
  const fullSignatures = getFunctionSignatures(fn, { capitalize: true, withTypes: true });

  let text = `${fn.name.toUpperCase()}($0)`;
  if (fn.customParametersSnippet) {
    text = `${fn.name.toUpperCase()}(${fn.customParametersSnippet})`;
  }
  return {
    label: fn.name.toUpperCase(),
    text,
    asSnippet: true,
    kind: 'Function',
    detail,
    documentation: {
      value: buildFunctionDocumentation(fullSignatures, fn.examples),
    },
    // agg functgions have priority over everything else
    sortText: fn.type === FunctionDefinitionTypes.AGG ? '1A' : 'C',
    // trigger a suggestion follow up on selection
    command: TRIGGER_SUGGESTION_COMMAND,
  };
}

/**
 * Builds suggestions for functions based on the provided predicates.
 *
 * @param predicates a set of conditions that must be met for a function to be included in the suggestions
 * @returns
 */
export const getFunctionSuggestions = (
  predicates?: FunctionFilterPredicates
): ISuggestionItem[] => {
  return filterFunctionDefinitions(allFunctions(), predicates).map(getFunctionSuggestion);
};
