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
import type {
  GetColumnsByTypeFn,
  ICommandCallbacks,
  ICommandContext,
  ISuggestionItem,
  Location,
} from '../../commands_registry/types';
import { listCompleteItem, commaCompleteItem } from '../../commands_registry/complete_items';
import {
  withAutoSuggest,
  getFieldsSuggestions,
  getFunctionsSuggestions,
  getLiteralsSuggestions,
} from './autocomplete/helpers';
import {
  type FunctionFilterPredicates,
  type FunctionParameterType,
  type FunctionDefinition,
  type SupportedDataType,
  FunctionDefinitionTypes,
  isParameterType,
  isReturnType,
  isArrayType,
} from '../types';
import { operatorsDefinitions, logicalOperators } from '../all_operators';
import {
  filterFunctionDefinitions,
  checkFunctionInvocationComplete,
  getFunctionDefinition,
} from './functions';
import { removeFinalUnknownIdentiferArg, getOverlapRange } from './shared';
import type { ESQLAstItem, ESQLFunction } from '../../types';
import { getTestFunctions } from './test_functions';
import type { FunctionParameterContext } from './autocomplete/expressions/types';

export function getOperatorSuggestion(fn: FunctionDefinition): ISuggestionItem {
  const hasArgs = fn.signatures.some(({ params }) => params.length > 1);
  const suggestion: ISuggestionItem = {
    label: fn.name.toUpperCase(),
    text: hasArgs ? `${fn.name.toUpperCase()} $0` : fn.name.toUpperCase(),
    asSnippet: hasArgs,
    kind: 'Operator',
    detail: fn.description,
    documentation: {
      value: '',
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
              params.some((pArg) => pArg.type === predicates?.leftParamType || pArg.type === 'any')
          )
        )
      : filteredDefinitions
  ).map(getOperatorSuggestion);
};

function getSupportedTypesForBinaryOperators(
  fnDef: FunctionDefinition | undefined,
  previousType: SupportedDataType | 'unknown'
) {
  // Retrieve list of all 'right' supported types that match the left hand side of the function
  return fnDef
    ? fnDef.signatures
        .filter(({ params }) => params.find((p) => p.name === 'left' && p.type === previousType))
        .map(({ params }) => params[1]?.type as SupportedDataType | 'unknown')
        .filter((type) => type !== undefined && !isArrayType(type))
    : [previousType];
}

/**
 * This function is used to
 * - suggest the next argument for an incomplete or incorrect binary operator expression (e.g. field > <suggest>)
 * - suggest an operator to the right of a complete binary operator expression (e.g. field > 0 <suggest>)
 * - suggest an operator to the right of a complete unary operator (e.g. field IS NOT NULL <suggest>)
 *
 * TODO — is this function doing too much?
 */
export async function getSuggestionsToRightOfOperatorExpression({
  queryText,
  location,
  rootOperator: operator,
  preferredExpressionType,
  getExpressionType,
  getColumnsByType,
  context,
  callbacks,
  addSpaceAfterOperator,
  openSuggestions,
  functionParameterContext,
}: {
  queryText: string;
  location: Location;
  rootOperator: ESQLFunction;
  preferredExpressionType?: SupportedDataType;
  getExpressionType: (expression: ESQLAstItem) => SupportedDataType | 'unknown';
  getColumnsByType: GetColumnsByTypeFn;
  context?: ICommandContext;
  callbacks?: ICommandCallbacks;
  addSpaceAfterOperator?: boolean;
  openSuggestions?: boolean;
  functionParameterContext?: FunctionParameterContext;
}) {
  const suggestions = [];
  const { complete, reason } = checkFunctionInvocationComplete(operator, getExpressionType);

  if (complete) {
    // i.e. ... | <COMMAND> field > 0 <suggest>
    // i.e. ... | <COMMAND> field + otherN <suggest>
    const operatorReturnType = getExpressionType(operator);
    suggestions.push(
      ...getOperatorSuggestions({
        location,
        // here we use the operator return type because we're suggesting operators that could
        // accept the result of the existing operator as a left operand
        leftParamType:
          operatorReturnType === 'unknown' || operatorReturnType === 'unsupported'
            ? 'any'
            : operatorReturnType,
        ignored: ['=', ':'],
        allowed:
          operatorReturnType === 'boolean'
            ? [
                ...logicalOperators
                  .filter(({ locationsAvailable }) => locationsAvailable.includes(location))
                  .map(({ name }) => name),
              ]
            : undefined,
      })
    );

    // Add comma if we're in a function with more mandatory args OR if it's a variadic function
    // Example: COALESCE(field < field ▌) → suggest AND/OR and comma
    const isVariadicFunction = functionParameterContext?.functionDefinition?.signatures?.some(
      (sig) => sig.minParams != null
    );

    if (
      operatorReturnType === 'boolean' &&
      (functionParameterContext?.hasMoreMandatoryArgs || isVariadicFunction)
    ) {
      suggestions.push(commaCompleteItem);
    }
  } else {
    // i.e. ... | <COMMAND> field >= <suggest>
    // i.e. ... | <COMMAND> field + <suggest>
    // i.e. ... | <COMMAND> field and <suggest>

    // Because it's an incomplete function, need to extract the type of the current argument
    // and suggest the next argument based on types

    // pick the last arg and check its type to verify whether is incomplete for the given function
    const cleanedArgs = removeFinalUnknownIdentiferArg(operator.args, getExpressionType);
    const leftArgType = getExpressionType(operator.args[cleanedArgs.length - 1]);

    if (reason === 'tooFewArgs') {
      const fnDef = getFunctionDefinition(operator.name);

      if (fnDef?.signatures.every(({ params }) => params.some(({ type }) => isArrayType(type)))) {
        suggestions.push(listCompleteItem);
      } else {
        // this is a special case with AND/OR
        // <COMMAND> expression AND/OR <suggest>
        // technically another boolean value should be suggested, but it is a better experience
        // to actually suggest a wider set of fields/functions
        const isAndOrWithBooleanLeft =
          leftArgType === 'boolean' &&
          (operator.name === 'and' || operator.name === 'or') &&
          getFunctionDefinition(operator.name)?.type === FunctionDefinitionTypes.OPERATOR;

        const typeToUse = isAndOrWithBooleanLeft
          ? (['any'] as (SupportedDataType | 'unknown' | 'any')[])
          : getSupportedTypesForBinaryOperators(fnDef, leftArgType);

        const useValueType = Boolean(operator.subtype === 'binary-expression');

        // Fields/columns suggestions
        suggestions.push(
          ...(await getFieldsSuggestions(typeToUse, getColumnsByType, {
            values: useValueType,
            addSpaceAfterField: addSpaceAfterOperator ?? false,
            openSuggestions: openSuggestions ?? false,
            promoteToTop: true,
          }))
        );

        // Date literals (policy-gated in helpers) with consistent advance/comma behavior
        suggestions.push(
          ...getLiteralsSuggestions(typeToUse, location, {
            includeDateLiterals: true,
            includeCompatibleLiterals: false,
            addComma: false,
            advanceCursorAndOpenSuggestions: openSuggestions ?? false,
          })
        );

        // Function suggestions
        suggestions.push(
          ...getFunctionsSuggestions({
            location,
            types: typeToUse,
            options: {
              ignored: [],
              addSpaceAfterFunction: addSpaceAfterOperator ?? false,
              openSuggestions: openSuggestions ?? false,
            },
            context,
            callbacks,
          })
        );
      }
    }

    /**
     * If the caller has supplied a preferred expression type, we can suggest operators that
     * would move the user toward that expression type.
     *
     * e.g. if we have a preferred type of boolean and we have `timestamp > "2002" AND doubleField`
     * this is an incorrect signature for AND because the left side is boolean and the right side is double
     *
     * Knowing that we prefer boolean expressions, we suggest operators that would accept doubleField as a left operand
     * and also return a boolean value.
     *
     * I believe this is only used in WHERE and probably bears some rethinking.
     */
    if (reason === 'wrongTypes') {
      if (leftArgType && preferredExpressionType) {
        // suggest something to complete the operator
        if (
          leftArgType !== preferredExpressionType &&
          isParameterType(leftArgType) &&
          isReturnType(preferredExpressionType)
        ) {
          suggestions.push(
            ...getOperatorSuggestions({
              location,
              leftParamType: leftArgType,
              returnTypes: [preferredExpressionType],
            })
          );
        }
      }
    }
  }

  return suggestions.map<ISuggestionItem>((s) => {
    const overlap = getOverlapRange(queryText, s.text);
    return {
      ...s,
      rangeToReplace: overlap,
    };
  });
}
