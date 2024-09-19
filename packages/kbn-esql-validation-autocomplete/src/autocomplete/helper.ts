/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstItem, ESQLCommand, ESQLFunction, ESQLSource } from '@kbn/esql-ast';
import { uniqBy } from 'lodash';
import type { FunctionDefinition } from '../definitions/types';
import {
  getFunctionDefinition,
  isAssignment,
  isFunctionItem,
  isLiteralItem,
} from '../shared/helpers';
import type { SuggestionRawDefinition } from './types';
import { compareTypesWithLiterals } from '../shared/esql_types';
import { TIME_SYSTEM_PARAMS } from './factories';
import { EDITOR_MARKER } from '../shared/constants';
import { extractTypeFromASTArg } from './autocomplete';
import { ESQLRealField, ESQLVariable } from '../validation/types';

function extractFunctionArgs(args: ESQLAstItem[]): ESQLFunction[] {
  return args.flatMap((arg) => (isAssignment(arg) ? arg.args[1] : arg)).filter(isFunctionItem);
}

function checkContent(fn: ESQLFunction): boolean {
  const fnDef = getFunctionDefinition(fn.name);
  return (!!fnDef && fnDef.type === 'agg') || extractFunctionArgs(fn.args).some(checkContent);
}

export function isAggFunctionUsedAlready(command: ESQLCommand, argIndex: number) {
  if (argIndex < 0) {
    return false;
  }
  const arg = command.args[argIndex];
  return isFunctionItem(arg) ? checkContent(arg) : false;
}

function getFnContent(fn: ESQLFunction): string[] {
  return [fn.name].concat(extractFunctionArgs(fn.args).flatMap(getFnContent));
}

export function getFunctionsToIgnoreForStats(command: ESQLCommand, argIndex: number) {
  if (argIndex < 0) {
    return [];
  }
  const arg = command.args[argIndex];
  return isFunctionItem(arg) ? getFnContent(arg) : [];
}

/**
 * Given a function signature, returns the parameter at the given position.
 *
 * Takes into account variadic functions (minParams), returning the last
 * parameter if the position is greater than the number of parameters.
 *
 * @param signature
 * @param position
 * @returns
 */
export function getParamAtPosition(
  { params, minParams }: FunctionDefinition['signatures'][number],
  position: number
) {
  return params.length > position ? params[position] : minParams ? params[params.length - 1] : null;
}

/**
 * Given a function signature, returns the parameter at the given position, even if it's undefined or null
 *
 * @param {params}
 * @param position
 * @returns
 */
export function strictlyGetParamAtPosition(
  { params }: FunctionDefinition['signatures'][number],
  position: number
) {
  return params[position] ? params[position] : null;
}

export function getQueryForFields(queryString: string, commands: ESQLCommand[]) {
  // If there is only one source command and it does not require fields, do not
  // fetch fields, hence return an empty string.
  return commands.length === 1 && ['from', 'row', 'show'].includes(commands[0].name)
    ? ''
    : queryString;
}

export function getSourcesFromCommands(commands: ESQLCommand[], sourceType: 'index' | 'policy') {
  const fromCommand = commands.find(({ name }) => name === 'from');
  const args = (fromCommand?.args ?? []) as ESQLSource[];
  return args.filter((arg) => arg.sourceType === sourceType);
}

export function removeQuoteForSuggestedSources(suggestions: SuggestionRawDefinition[]) {
  return suggestions.map((d) => ({
    ...d,
    // "text" -> text
    text: d.text.startsWith('"') && d.text.endsWith('"') ? d.text.slice(1, -1) : d.text,
  }));
}

export function getSupportedTypesForBinaryOperators(
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

export function getValidFunctionSignaturesForPreviousArgs(
  fnDefinition: FunctionDefinition,
  enrichedArgs: Array<
    ESQLAstItem & {
      dataType: string;
    }
  >,
  argIndex: number
) {
  // Filter down to signatures that match every params up to the current argIndex
  // e.g. BUCKET(longField, /) => all signatures with first param as long column type
  // or BUCKET(longField, 2, /) => all signatures with (longField, integer, ...)
  const relevantFuncSignatures = fnDefinition.signatures.filter(
    (s) =>
      s.params?.length >= argIndex &&
      s.params.slice(0, argIndex).every(({ type: dataType }, idx) => {
        return (
          dataType === enrichedArgs[idx].dataType ||
          compareTypesWithLiterals(dataType, enrichedArgs[idx].dataType)
        );
      })
  );
  return relevantFuncSignatures;
}

/**
 * Given a function signature, returns the compatible types to suggest for the next argument
 *
 * @param fnDefinition: the function definition
 * @param enrichedArgs: AST args with enriched esType info to match with function signatures
 * @param argIndex: the index of the argument to suggest for
 * @returns
 */
export function getCompatibleTypesToSuggestNext(
  fnDefinition: FunctionDefinition,
  enrichedArgs: Array<
    ESQLAstItem & {
      dataType: string;
    }
  >,
  argIndex: number
) {
  // First, narrow down to valid function signatures based on previous arguments
  const relevantFuncSignatures = getValidFunctionSignaturesForPreviousArgs(
    fnDefinition,
    enrichedArgs,
    argIndex
  );

  // Then, get the compatible types to suggest for the next argument
  const compatibleTypesToSuggestForArg = uniqBy(
    relevantFuncSignatures.map((f) => f.params[argIndex]).filter((d) => d),
    (o) => `${o.type}-${o.constantOnly}`
  );
  return compatibleTypesToSuggestForArg;
}

/**
 * Checks the suggestion text for overlap with the current query.
 *
 * This is useful to determine the range of the existing query that should be
 * replaced if the suggestion is accepted.
 *
 * For example
 * QUERY: FROM source | WHERE field IS NO
 * SUGGESTION: IS NOT NULL
 *
 * The overlap is "IS NO" and the range to replace is "IS NO" in the query.
 *
 * @param query
 * @param suggestionText
 * @returns
 */
export function getOverlapRange(
  query: string,
  suggestionText: string
): { start: number; end: number } {
  let overlapLength = 0;

  // Convert both strings to lowercase for case-insensitive comparison
  const lowerQuery = query.toLowerCase();
  const lowerSuggestionText = suggestionText.toLowerCase();

  for (let i = 0; i <= lowerSuggestionText.length; i++) {
    const substr = lowerSuggestionText.substring(0, i);
    if (lowerQuery.endsWith(substr)) {
      overlapLength = i;
    }
  }

  return {
    start: Math.min(query.length - overlapLength + 1, query.length),
    end: query.length,
  };
}

function isValidDateString(dateString: unknown): boolean {
  if (typeof dateString !== 'string') return false;
  const timestamp = Date.parse(dateString.replace(/\"/g, ''));
  return !isNaN(timestamp);
}

/**
 * Returns true is node is a valid literal that represents a date
 * either a system time parameter or a date string generated by date picker
 * @param dateString
 * @returns
 */
export function isLiteralDateItem(nodeArg: ESQLAstItem): boolean {
  return (
    isLiteralItem(nodeArg) &&
    // If text is ?start or ?end, it's a system time parameter
    (TIME_SYSTEM_PARAMS.includes(nodeArg.text) ||
      // Or if it's a string generated by date picker
      isValidDateString(nodeArg.value))
  );
}

export function getValidSignaturesAndTypesToSuggestNext(
  node: ESQLFunction,
  references: { fields: Map<string, ESQLRealField>; variables: Map<string, ESQLVariable[]> },
  fnDefinition: FunctionDefinition,
  fullText: string,
  offset: number
) {
  const enrichedArgs = node.args.map((nodeArg) => {
    let dataType = extractTypeFromASTArg(nodeArg, references);

    // For named system time parameters ?start and ?end, make sure it's compatiable
    if (isLiteralDateItem(nodeArg)) {
      dataType = 'date';
    }

    return { ...nodeArg, dataType } as ESQLAstItem & { dataType: string };
  });

  // pick the type of the next arg
  const shouldGetNextArgument = node.text.includes(EDITOR_MARKER);
  let argIndex = Math.max(node.args.length, 0);
  if (!shouldGetNextArgument && argIndex) {
    argIndex -= 1;
  }

  const validSignatures = getValidFunctionSignaturesForPreviousArgs(
    fnDefinition,
    enrichedArgs,
    argIndex
  );
  // Retrieve unique of types that are compatiable for the current arg
  const typesToSuggestNext = getCompatibleTypesToSuggestNext(fnDefinition, enrichedArgs, argIndex);
  const hasMoreMandatoryArgs = !validSignatures
    // Types available to suggest next after this argument is completed
    .map((signature) => strictlyGetParamAtPosition(signature, argIndex + 1))
    // when a param is null, it means param is optional
    // If there's at least one param that is optional, then
    // no need to suggest comma
    .some((p) => p === null || p?.optional === true);

  // Whether to prepend comma to suggestion string
  // E.g. if true, "fieldName" -> "fieldName, "
  const alreadyHasComma = fullText ? fullText[offset] === ',' : false;
  const shouldAddComma =
    hasMoreMandatoryArgs && fnDefinition.type !== 'builtin' && !alreadyHasComma;
  const currentArg = enrichedArgs[argIndex];
  return {
    shouldAddComma,
    typesToSuggestNext,
    validSignatures,
    hasMoreMandatoryArgs,
    enrichedArgs,
    argIndex,
    currentArg,
  };
}
