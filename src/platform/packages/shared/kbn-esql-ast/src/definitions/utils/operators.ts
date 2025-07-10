/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { TRIGGER_SUGGESTION_COMMAND } from '../../commands_registry/constants';
import type { GetColumnsByTypeFn, ISuggestionItem, Location } from '../../commands_registry/types';
import { listCompleteItem } from '../../commands_registry/complete_items';
import { getFieldsOrFunctionsSuggestions } from './autocomplete';
import {
  type FunctionFilterPredicates,
  type FunctionParameterType,
  type FunctionDefinition,
  type SupportedDataType,
  type ArrayType,
  FunctionDefinitionTypes,
  isParameterType,
  isReturnType,
} from '../types';
import { operatorsDefinitions } from '../all_operators';
import {
  filterFunctionDefinitions,
  checkFunctionInvocationComplete,
  getFunctionDefinition,
} from './functions';
import { removeFinalUnknownIdentiferArg, getOverlapRange } from './shared';
import { ESQLAstItem, ESQLFunction } from '../../types';
import { getTestFunctions } from './test_functions';

export function getOperatorSuggestion(fn: FunctionDefinition): ISuggestionItem {
  const hasArgs = fn.signatures.some(({ params }) => params.length > 1);
  return {
    label: fn.name.toUpperCase(),
    text: hasArgs ? `${fn.name.toUpperCase()} $0` : fn.name.toUpperCase(),
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

/**
 * Builds suggestions for operators based on the provided predicates.
 *
 * @param predicates a set of conditions that must be met for an operator to be included in the suggestions
 * @returns
 */
export const getOperatorSuggestions = (
  predicates?: FunctionFilterPredicates & { leftParamType?: FunctionParameterType }
): ISuggestionItem[] => {
  const filteredDefinitions = filterFunctionDefinitions(
    getTestFunctions().length
      ? [...operatorsDefinitions, ...getTestFunctions()]
      : operatorsDefinitions,
    predicates
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

export const getOperatorsSuggestionsAfterNot = (): ISuggestionItem[] => {
  return operatorsDefinitions
    .filter(({ name }) => name === 'like' || name === 'rlike' || name === 'in')
    .map(getOperatorSuggestion);
};

export function isArrayType(type: string): type is ArrayType {
  return type.endsWith('[]');
}

function getSupportedTypesForBinaryOperators(
  fnDef: FunctionDefinition | undefined,
  previousType: string
) {
  // Retrieve list of all 'right' supported types that match the left hand side of the function
  return fnDef && Array.isArray(fnDef?.signatures)
    ? fnDef.signatures
        .filter(({ params }) => params.find((p) => p.name === 'left' && p.type === previousType))
        .map(({ params }) => params[1].type)
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
}: {
  queryText: string;
  location: Location;
  rootOperator: ESQLFunction;
  preferredExpressionType?: SupportedDataType;
  getExpressionType: (expression: ESQLAstItem) => SupportedDataType | 'unknown';
  getColumnsByType: GetColumnsByTypeFn;
}) {
  const suggestions = [];
  const isFnComplete = checkFunctionInvocationComplete(operator, getExpressionType);
  if (isFnComplete.complete) {
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
      })
    );
  } else {
    // i.e. ... | <COMMAND> field >= <suggest>
    // i.e. ... | <COMMAND> field + <suggest>
    // i.e. ... | <COMMAND> field and <suggest>

    // Because it's an incomplete function, need to extract the type of the current argument
    // and suggest the next argument based on types

    // pick the last arg and check its type to verify whether is incomplete for the given function
    const cleanedArgs = removeFinalUnknownIdentiferArg(operator.args, getExpressionType);
    const leftArgType = getExpressionType(operator.args[cleanedArgs.length - 1]);

    if (isFnComplete.reason === 'tooFewArgs') {
      const fnDef = getFunctionDefinition(operator.name);
      if (
        fnDef?.signatures.every(({ params }) =>
          params.some(({ type }) => isArrayType(type as string))
        )
      ) {
        suggestions.push(listCompleteItem);
      } else {
        const finalType = leftArgType || 'any';
        const supportedTypes = getSupportedTypesForBinaryOperators(fnDef, finalType as string);

        // this is a special case with AND/OR
        // <COMMAND> expression AND/OR <suggest>
        // technically another boolean value should be suggested, but it is a better experience
        // to actually suggest a wider set of fields/functions
        const typeToUse =
          finalType === 'boolean' &&
          getFunctionDefinition(operator.name)?.type === FunctionDefinitionTypes.OPERATOR
            ? ['any']
            : (supportedTypes as string[]);

        // TODO replace with fields callback + function suggestions
        suggestions.push(
          ...(await getFieldsOrFunctionsSuggestions(typeToUse, location, getColumnsByType, {
            functions: true,
            fields: true,
            values: Boolean(operator.subtype === 'binary-expression'),
          }))
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
    if (isFnComplete.reason === 'wrongTypes') {
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
