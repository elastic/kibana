/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isIdentifier,
  type ESQLAstItem,
  type ESQLCommand,
  type ESQLFunction,
  type ESQLLiteral,
  type ESQLSource,
} from '@kbn/esql-ast';
import { uniqBy } from 'lodash';
import {
  isParameterType,
  type FunctionDefinition,
  type FunctionReturnType,
  type SupportedDataType,
  isReturnType,
} from '../definitions/types';
import {
  findFinalWord,
  getColumnForASTNode,
  getFunctionDefinition,
  isArrayType,
  isAssignment,
  isColumnItem,
  isFunctionItem,
  isLiteralItem,
  isTimeIntervalItem,
} from '../shared/helpers';
import type { GetColumnsByTypeFn, SuggestionRawDefinition } from './types';
import { compareTypesWithLiterals } from '../shared/esql_types';
import {
  TIME_SYSTEM_PARAMS,
  buildVariablesDefinitions,
  getFunctionSuggestions,
  getCompatibleLiterals,
  getDateLiterals,
  getOperatorSuggestions,
} from './factories';
import { EDITOR_MARKER } from '../shared/constants';
import { ESQLRealField, ESQLVariable, ReferenceMaps } from '../validation/types';
import { listCompleteItem } from './complete_items';
import { removeMarkerArgFromArgsList } from '../shared/context';
import { ESQLVariableType } from '../shared/types';

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
  return commands.length === 1 && ['row', 'show'].includes(commands[0].name) ? '' : queryString;
}

export function getSourcesFromCommands(commands: ESQLCommand[], sourceType: 'index' | 'policy') {
  const fromCommand = commands.find(({ name }) => name === 'from');
  const args = (fromCommand?.args ?? []) as ESQLSource[];
  // the marker gets added in queries like "FROM "
  return args.filter(
    (arg) => arg.sourceType === sourceType && arg.name !== '' && arg.name !== EDITOR_MARKER
  );
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

  // add one since Monaco columns are 1-based
  return {
    start: query.length - overlapLength + 1,
    end: query.length + 1,
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

/**
 * This function handles the logic to suggest completions
 * for a given fragment of text in a generic way. A good example is
 * a field name.
 *
 * When typing a field name, there are 2 scenarios
 *
 * 1. field name is incomplete (includes the empty string)
 * KEEP /
 * KEEP fie/
 *
 * 2. field name is complete
 * KEEP field/
 *
 * This function provides a framework for detecting and handling both scenarios in a clean way.
 *
 * @param innerText - the query text before the current cursor position
 * @param isFragmentComplete — return true if the fragment is complete
 * @param getSuggestionsForIncomplete — gets suggestions for an incomplete fragment
 * @param getSuggestionsForComplete - gets suggestions for a complete fragment
 * @returns
 */
export function handleFragment(
  innerText: string,
  isFragmentComplete: (fragment: string) => boolean,
  getSuggestionsForIncomplete: (
    fragment: string,
    rangeToReplace?: { start: number; end: number }
  ) => SuggestionRawDefinition[] | Promise<SuggestionRawDefinition[]>,
  getSuggestionsForComplete: (
    fragment: string,
    rangeToReplace: { start: number; end: number }
  ) => SuggestionRawDefinition[] | Promise<SuggestionRawDefinition[]>
): SuggestionRawDefinition[] | Promise<SuggestionRawDefinition[]> {
  /**
   * @TODO — this string manipulation is crude and can't support all cases
   * Checking for a partial word and computing the replacement range should
   * really be done using the AST node, but we'll have to refactor further upstream
   * to make that available. This is a quick fix to support the most common case.
   */
  const fragment = findFinalWord(innerText);
  if (!fragment) {
    return getSuggestionsForIncomplete('');
  } else {
    const rangeToReplace = {
      start: innerText.length - fragment.length + 1,
      end: innerText.length + 1,
    };
    if (isFragmentComplete(fragment)) {
      return getSuggestionsForComplete(fragment, rangeToReplace);
    } else {
      return getSuggestionsForIncomplete(fragment, rangeToReplace);
    }
  }
}
/**
 * TODO — split this into distinct functions, one for fields, one for functions, one for literals
 */
export async function getFieldsOrFunctionsSuggestions(
  types: string[],
  commandName: string,
  optionName: string | undefined,
  getFieldsByType: GetColumnsByTypeFn,
  {
    functions,
    fields,
    variables,
    values = false,
    literals = false,
  }: {
    functions: boolean;
    fields: boolean;
    variables?: Map<string, ESQLVariable[]>;
    literals?: boolean;
    values?: boolean;
  },
  {
    ignoreFn = [],
    ignoreColumns = [],
  }: {
    ignoreFn?: string[];
    ignoreColumns?: string[];
  } = {}
): Promise<SuggestionRawDefinition[]> {
  const filteredFieldsByType = pushItUpInTheList(
    (await (fields
      ? getFieldsByType(types, ignoreColumns, {
          advanceCursor: commandName === 'sort',
          openSuggestions: commandName === 'sort',
          variableType: values ? ESQLVariableType.VALUES : ESQLVariableType.FIELDS,
        })
      : [])) as SuggestionRawDefinition[],
    functions
  );

  const filteredVariablesByType: string[] = [];
  if (variables) {
    for (const variable of variables.values()) {
      if (
        (types.includes('any') || types.includes(variable[0].type)) &&
        !ignoreColumns.includes(variable[0].name)
      ) {
        filteredVariablesByType.push(variable[0].name);
      }
    }
    // due to a bug on the ES|QL table side, filter out fields list with underscored variable names (??)
    // avg( numberField ) => avg_numberField_
    const ALPHANUMERIC_REGEXP = /[^a-zA-Z\d]/g;
    if (
      filteredVariablesByType.length &&
      filteredVariablesByType.some((v) => ALPHANUMERIC_REGEXP.test(v))
    ) {
      for (const variable of filteredVariablesByType) {
        const underscoredName = variable.replace(ALPHANUMERIC_REGEXP, '_');
        const index = filteredFieldsByType.findIndex(
          ({ label }) => underscoredName === label || `_${underscoredName}_` === label
        );
        if (index >= 0) {
          filteredFieldsByType.splice(index);
        }
      }
    }
  }
  // could also be in stats (bucket) but our autocomplete is not great yet
  const displayDateSuggestions = types.includes('date') && ['where', 'eval'].includes(commandName);

  const suggestions = filteredFieldsByType.concat(
    displayDateSuggestions ? getDateLiterals() : [],
    functions
      ? getFunctionSuggestions({
          command: commandName,
          option: optionName,
          returnTypes: types,
          ignored: ignoreFn,
        })
      : [],
    variables
      ? pushItUpInTheList(buildVariablesDefinitions(filteredVariablesByType), functions)
      : [],
    literals ? getCompatibleLiterals(commandName, types) : []
  );

  return suggestions;
}

export function pushItUpInTheList(suggestions: SuggestionRawDefinition[], shouldPromote: boolean) {
  if (!shouldPromote) {
    return suggestions;
  }
  return suggestions.map(({ sortText, ...rest }) => ({
    ...rest,
    sortText: `1${sortText}`,
  }));
}

/** @deprecated — use getExpressionType instead (src/platform/packages/shared/kbn-esql-validation-autocomplete/src/shared/helpers.ts) */
export function extractTypeFromASTArg(
  arg: ESQLAstItem,
  references: Pick<ReferenceMaps, 'fields' | 'variables'>
):
  | ESQLLiteral['literalType']
  | SupportedDataType
  | FunctionReturnType
  | 'timeInterval'
  | string // @TODO remove this
  | undefined {
  if (Array.isArray(arg)) {
    return extractTypeFromASTArg(arg[0], references);
  }
  if (isLiteralItem(arg)) {
    return arg.literalType;
  }
  if (isColumnItem(arg) || isIdentifier(arg)) {
    const hit = getColumnForASTNode(arg, references);
    if (hit) {
      return hit.type;
    }
  }
  if (isTimeIntervalItem(arg)) {
    return arg.type;
  }
  if (isFunctionItem(arg)) {
    const fnDef = getFunctionDefinition(arg.name);
    if (fnDef) {
      // @TODO: improve this to better filter down the correct return type based on existing arguments
      // just mind that this can be highly recursive...
      return fnDef.signatures[0].returnType;
    }
  }
}

// @TODO: refactor this to be shared with validation
export function checkFunctionInvocationComplete(
  func: ESQLFunction,
  getExpressionType: (expression: ESQLAstItem) => SupportedDataType | 'unknown'
): {
  complete: boolean;
  reason?: 'tooFewArgs' | 'wrongTypes';
} {
  const fnDefinition = getFunctionDefinition(func.name);
  if (!fnDefinition) {
    return { complete: false };
  }
  const cleanedArgs = removeMarkerArgFromArgsList(func)!.args;
  const argLengthCheck = fnDefinition.signatures.some((def) => {
    if (def.minParams && cleanedArgs.length >= def.minParams) {
      return true;
    }
    if (cleanedArgs.length === def.params.length) {
      return true;
    }
    return cleanedArgs.length >= def.params.filter(({ optional }) => !optional).length;
  });
  if (!argLengthCheck) {
    return { complete: false, reason: 'tooFewArgs' };
  }
  if (fnDefinition.name === 'in' && Array.isArray(func.args[1]) && !func.args[1].length) {
    return { complete: false, reason: 'tooFewArgs' };
  }
  const hasCorrectTypes = fnDefinition.signatures.some((def) => {
    return func.args.every((a, index) => {
      return (
        (fnDefinition.name.endsWith('null') && def.params[index].type === 'any') ||
        def.params[index].type === getExpressionType(a)
      );
    });
  });
  if (!hasCorrectTypes) {
    return { complete: false, reason: 'wrongTypes' };
  }
  return { complete: true };
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
  commandName,
  optionName,
  rootOperator: operator,
  preferredExpressionType,
  getExpressionType,
  getColumnsByType,
}: {
  queryText: string;
  commandName: string;
  optionName?: string;
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
        command: commandName,
        option: optionName,
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
    const cleanedArgs = removeMarkerArgFromArgsList(operator)!.args;
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
        const finalType = leftArgType || leftArgType || 'any';
        const supportedTypes = getSupportedTypesForBinaryOperators(fnDef, finalType as string);

        // this is a special case with AND/OR
        // <COMMAND> expression AND/OR <suggest>
        // technically another boolean value should be suggested, but it is a better experience
        // to actually suggest a wider set of fields/functions
        const typeToUse =
          finalType === 'boolean' && getFunctionDefinition(operator.name)?.type === 'builtin'
            ? ['any']
            : (supportedTypes as string[]);

        // TODO replace with fields callback + function suggestions
        suggestions.push(
          ...(await getFieldsOrFunctionsSuggestions(
            typeToUse,
            commandName,
            optionName,
            getColumnsByType,
            {
              functions: true,
              fields: true,
              values: Boolean(operator.subtype === 'binary-expression'),
            }
          ))
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
              command: commandName,
              leftParamType: leftArgType,
              returnTypes: [preferredExpressionType],
            })
          );
        }
      }
    }
  }
  return suggestions.map<SuggestionRawDefinition>((s) => {
    const overlap = getOverlapRange(queryText, s.text);
    const offset = overlap.start === overlap.end ? 1 : 0;
    return {
      ...s,
      rangeToReplace: {
        start: overlap.start + offset,
        end: overlap.end + offset,
      },
    };
  });
}
