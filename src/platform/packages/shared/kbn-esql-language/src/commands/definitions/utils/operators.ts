/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { LicenseType } from '@kbn/licensing-types';
import type { PricingProduct } from '@kbn/core-pricing-common/src/types';
import type { ISuggestionItem } from '../../registry/types';
import { withAutoSuggest } from './autocomplete/helpers';
import {
  type FunctionFilterPredicates,
  type FunctionParameterType,
  type FunctionDefinition,
} from '../types';
import { operatorsDefinitions } from '../all_operators';
import { filterFunctionDefinitions } from './functions';
import { getTestFunctions } from './test_functions';

export function getOperatorSuggestion(fn: FunctionDefinition): ISuggestionItem {
  const hasArgs = fn.signatures.some(({ params }) => params.length > 1);
  const suggestion: ISuggestionItem = {
    label: fn.name.toUpperCase(),
    text: hasArgs ? `${fn.name.toUpperCase()} $0` : fn.name.toUpperCase(),
    asSnippet: hasArgs,
    kind: 'Operator',
    documentation: {
      value: fn.description,
    },
    sortText: 'D',
  };
  return hasArgs ? withAutoSuggest(suggestion) : suggestion;
}

/**
 * Builds suggestions for operators based on the provided predicates.
 *
 * @param predicates a set of conditions that must be met for an operator to be included in the suggestions
 * @returns
 */
export const getOperatorSuggestions = (
  predicates?: FunctionFilterPredicates & { leftParamType?: FunctionParameterType },
  hasMinimumLicenseRequired?: ((minimumLicenseRequired: LicenseType) => boolean) | undefined,
  activeProduct?: PricingProduct | undefined
): ISuggestionItem[] => {
  const filteredDefinitions = filterFunctionDefinitions(
    getTestFunctions().length
      ? [...operatorsDefinitions, ...getTestFunctions()]
      : operatorsDefinitions,
    predicates,
    hasMinimumLicenseRequired,
    activeProduct
  );

  // make sure the operator has at least one signature that matches
  // the type of the existing left argument if provided (e.g. "doubleField <suggest>")
  return (
    predicates?.leftParamType
      ? filteredDefinitions.filter(({ signatures }) =>
          signatures.some(
            ({ params }) =>
              !params.length ||
              params.some(
                (pArg) =>
                  pArg.type === predicates?.leftParamType ||
                  pArg.type === 'any' ||
                  // all ES|QL functions accept null, but this is not reflected
                  // in our function definitions so we let it through here
                  predicates?.leftParamType === 'null'
              )
          )
        )
      : filteredDefinitions
  ).map(getOperatorSuggestion);
};
