/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import {
  ESQLSingleAstItem,
  Walker,
  isIdentifier,
  type ESQLAstItem,
  type ESQLCommand,
  type ESQLFunction,
  type ESQLLiteral,
  type ESQLSource,
  ESQLAstQueryExpression,
  BasicPrettyPrinter,
} from '@kbn/esql-ast';
import { ESQLVariableType, IndexAutocompleteItem } from '@kbn/esql-types';
import { uniqBy } from 'lodash';
import { logicalOperators } from '../definitions/all_operators';
import {
  CommandSuggestParams,
  FunctionDefinitionTypes,
  Location,
  isParameterType,
  isReturnType,
  type FunctionDefinition,
  type FunctionReturnType,
  type SupportedDataType,
} from '../definitions/types';
import {
  EDITOR_MARKER,
  UNSUPPORTED_COMMANDS_BEFORE_MATCH,
  UNSUPPORTED_COMMANDS_BEFORE_QSTR,
} from '../shared/constants';
import { compareTypesWithLiterals } from '../shared/esql_types';
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
  sourceExists,
  isParamExpressionType,
} from '../shared/helpers';
import type { ESQLSourceResult } from '../shared/types';
import { listCompleteItem, commaCompleteItem, pipeCompleteItem } from './complete_items';
import { ESQLFieldWithMetadata, ESQLUserDefinedColumn, ReferenceMaps } from '../validation/types';
import {
  TIME_SYSTEM_PARAMS,
  TRIGGER_SUGGESTION_COMMAND,
  buildUserDefinedColumnsDefinitions,
  getCompatibleLiterals,
  getDateLiterals,
  getFunctionSuggestions,
  getOperatorSuggestion,
  getOperatorSuggestions,
  getSuggestionsAfterNot,
  buildSourcesDefinitions,
} from './factories';
import { metadataSuggestion } from './commands/metadata';

import type { GetColumnsByTypeFn, SuggestionRawDefinition } from './types';

/**
 * This function returns a list of closing brackets that can be appended to
 * a partial query to make it valid.
 *
 * A known limitation of this is that is not aware of commas "," or pipes "|"
 * so it is not yet helpful on a multiple commands errors (a workaround is to pass each command here...)
 * @param text
 * @returns
 */
export function getBracketsToClose(text: string) {
  const stack = [];
  const pairs: Record<string, string> = { '"""': '"""', '/*': '*/', '(': ')', '[': ']', '"': '"' };
  const pairsReversed: Record<string, string> = {
    '"""': '"""',
    '*/': '/*',
    ')': '(',
    ']': '[',
    '"': '"',
  };

  for (let i = 0; i < text.length; i++) {
    for (const openBracket in pairs) {
      if (!Object.hasOwn(pairs, openBracket)) {
        continue;
      }

      const substr = text.slice(i, i + openBracket.length);
      if (pairsReversed[substr] && pairsReversed[substr] === stack[stack.length - 1]) {
        stack.pop();
        break;
      } else if (substr === openBracket) {
        stack.push(substr);
        break;
      }
    }
  }
  return stack.reverse().map((bracket) => pairs[bracket]);
}

/**
 * This function attempts to correct the syntax of a partial query to make it valid.
 *
 * We are generally dealing with incomplete queries when the user is typing. But,
 * having an AST is helpful so we heuristically correct the syntax so it can be parsed.
 *
 * @param _query
 * @param context
 * @returns
 */
export function correctQuerySyntax(_query: string) {
  let query = _query;
  // check if all brackets are closed, otherwise close them
  const bracketsToAppend = getBracketsToClose(query);

  const endsWithBinaryOperatorRegex =
    /(?:\+|\/|==|>=|>|in|<=|<|like|:|%|\*|-|not in|not like|not rlike|!=|rlike|and|or|not|=|as)\s+$/i;
  const endsWithCommaRegex = /,\s+$/;

  if (endsWithBinaryOperatorRegex.test(query) || endsWithCommaRegex.test(query)) {
    query += ` ${EDITOR_MARKER}`;
  }

  query += bracketsToAppend.join('');

  return query;
}

function extractFunctionArgs(args: ESQLAstItem[]): ESQLFunction[] {
  return args.flatMap((arg) => (isAssignment(arg) ? arg.args[1] : arg)).filter(isFunctionItem);
}

function checkContent(fn: ESQLFunction): boolean {
  const fnDef = getFunctionDefinition(fn.name);
  return (
    (!!fnDef && fnDef.type === FunctionDefinitionTypes.AGG) ||
    extractFunctionArgs(fn.args).some(checkContent)
  );
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

/**
 * This function is used to build the query that will be used to compute the
 * available fields for the current cursor location.
 *
 * Generally, this is the user's query up to the end of the previous command.
 *
 * @param queryString The original query string
 * @param commands
 * @returns
 */
export function getQueryForFields(queryString: string, root: ESQLAstQueryExpression): string {
  const commands = root.commands;
  const lastCommand = commands[commands.length - 1];
  if (lastCommand && lastCommand.name === 'fork' && lastCommand.args.length > 0) {
    /**
     * This translates the current fork command branch into a simpler but equivalent
     * query that is compatible with the existing field computation/caching strategy.
     *
     * The intuition here is that if the cursor is within a fork branch, the
     * previous context is equivalent to a query without the FORK command.:
     *
     * Original query: FROM lolz | EVAL foo = 1 | FORK (EVAL bar = 2) (EVAL baz = 3 | WHERE /)
     * Simplified: FROM lolz | EVAL foo = 1 | EVAL baz = 3 | WHERE /
     */
    const currentBranch = lastCommand.args[lastCommand.args.length - 1] as ESQLAstQueryExpression;
    const newCommands = commands.slice(0, -1).concat(currentBranch.commands.slice(0, -1));
    return BasicPrettyPrinter.print({ ...root, commands: newCommands });
  }

  // If there is only one source command and it does not require fields, do not
  // fetch fields, hence return an empty string.
  return commands.length === 1 && ['row', 'show'].includes(commands[0].name)
    ? ''
    : buildQueryUntilPreviousCommand(queryString, commands);
}

// TODO consider replacing this with a pretty printer-based solution
function buildQueryUntilPreviousCommand(queryString: string, commands: ESQLCommand[]) {
  const prevCommand = commands[Math.max(commands.length - 2, 0)];
  return prevCommand ? queryString.substring(0, prevCommand.location.max + 1) : queryString;
}

export function getSourcesFromCommands(commands: ESQLCommand[], sourceType: 'index' | 'policy') {
  const sourceCommand = commands.find(({ name }) => name === 'from' || name === 'ts');
  const args = (sourceCommand?.args ?? []) as ESQLSource[];
  // the marker gets added in queries like "FROM "
  return args.filter(
    (arg) => arg.sourceType === sourceType && arg.name !== '' && arg.name !== EDITOR_MARKER
  );
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
): { start: number; end: number } | undefined {
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

  if (overlapLength === 0) {
    return;
  }

  return {
    start: query.length - overlapLength,
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
  references: {
    fields: Map<string, ESQLFieldWithMetadata>;
    userDefinedColumns: Map<string, ESQLUserDefinedColumn[]>;
  },
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
    hasMoreMandatoryArgs &&
    fnDefinition.type !== FunctionDefinitionTypes.OPERATOR &&
    !alreadyHasComma;
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
      start: innerText.length - fragment.length,
      end: innerText.length,
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
  location: Location,
  getFieldsByType: GetColumnsByTypeFn,
  {
    functions,
    fields,
    userDefinedColumns,
    values = false,
    literals = false,
  }: {
    functions: boolean;
    fields: boolean;
    userDefinedColumns?: Map<string, ESQLUserDefinedColumn[]>;
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
          advanceCursor: location === Location.SORT,
          openSuggestions: location === Location.SORT,
          variableType: values ? ESQLVariableType.VALUES : ESQLVariableType.FIELDS,
        })
      : [])) as SuggestionRawDefinition[],
    functions
  );

  const filteredColumnByType: string[] = [];
  if (userDefinedColumns) {
    for (const userDefinedColumn of userDefinedColumns.values()) {
      if (
        (types.includes('any') || types.includes(userDefinedColumn[0].type)) &&
        !ignoreColumns.includes(userDefinedColumn[0].name)
      ) {
        filteredColumnByType.push(userDefinedColumn[0].name);
      }
    }
    // due to a bug on the ES|QL table side, filter out fields list with underscored userDefinedColumns names (??)
    // avg( numberField ) => avg_numberField_
    const ALPHANUMERIC_REGEXP = /[^a-zA-Z\d]/g;
    if (
      filteredColumnByType.length &&
      filteredColumnByType.some((v) => ALPHANUMERIC_REGEXP.test(v))
    ) {
      for (const userDefinedColumn of filteredColumnByType) {
        const underscoredName = userDefinedColumn.replace(ALPHANUMERIC_REGEXP, '_');
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
  const displayDateSuggestions =
    types.includes('date') && [Location.WHERE, Location.EVAL].includes(location);

  const suggestions = filteredFieldsByType.concat(
    displayDateSuggestions ? getDateLiterals() : [],
    functions
      ? getFunctionSuggestions({
          location,
          returnTypes: types,
          ignored: ignoreFn,
        })
      : [],
    userDefinedColumns
      ? pushItUpInTheList(buildUserDefinedColumnsDefinitions(filteredColumnByType), functions)
      : [],
    literals ? getCompatibleLiterals(types) : []
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
  references: Pick<ReferenceMaps, 'fields' | 'userDefinedColumns'>
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

/**
 * In several cases we don't want to count the last arg if it is
 * of type unknown.
 *
 * this solves for the case where the user has typed a
 * prefix (e.g. "keywordField != tex/")
 *
 * "tex" is not a recognizable identifier so it is of
 * type "unknown" which leads us to continue suggesting
 * fields/functions.
 *
 * Monaco will then filter our suggestions list
 * based on the "tex" prefix which gives the correct UX
 */
function removeFinalUnknownIdentiferArg(
  args: ESQLAstItem[],
  getExpressionType: (expression: ESQLAstItem) => SupportedDataType | 'unknown'
) {
  return getExpressionType(args[args.length - 1]) === 'unknown'
    ? args.slice(0, args.length - 1)
    : args;
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

  const cleanedArgs = removeFinalUnknownIdentiferArg(func.args, getExpressionType);

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
  if (
    (fnDefinition.name === 'in' || fnDefinition.name === 'not in') &&
    Array.isArray(func.args[1]) &&
    !func.args[1].length
  ) {
    return { complete: false, reason: 'tooFewArgs' };
  }

  // If the function is complete, check that the types of the arguments match the function definition
  const hasCorrectTypes = fnDefinition.signatures.some((def) => {
    return func.args.every((a, index) => {
      return (
        fnDefinition.name.endsWith('null') ||
        def.params[index].type === 'any' ||
        def.params[index].type === getExpressionType(a) ||
        // this is a special case for expressions with named parameters
        // e.g. "WHERE field == ?value"
        isParamExpressionType(getExpressionType(a))
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
  return suggestions.map<SuggestionRawDefinition>((s) => {
    const overlap = getOverlapRange(queryText, s.text);
    return {
      ...s,
      rangeToReplace: overlap,
    };
  });
}

/**
 * The position of the cursor within an expression.
 */
type ExpressionPosition =
  | 'after_column'
  | 'after_function'
  | 'after_not'
  | 'after_operator'
  | 'after_literal'
  | 'empty_expression';

/**
 * Escapes special characters in a string to be used as a literal match in a regular expression.
 * @param {string} text The input string to escape.
 * @returns {string} The escaped string.
 */
function escapeRegExp(text: string): string {
  // Characters with special meaning in regex: . * + ? ^ $ { } ( ) | [ ] \
  // We need to escape all of them. The `$&` in the replacement string means "the matched substring".
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Determines the position of the cursor within an expression.
 * @param innerText
 * @param expressionRoot
 * @returns
 */
export const getExpressionPosition = (
  innerText: string,
  expressionRoot: ESQLSingleAstItem | undefined
): ExpressionPosition => {
  const endsWithNot = / not$/i.test(innerText.trimEnd());
  if (
    endsWithNot &&
    !(
      expressionRoot &&
      isFunctionItem(expressionRoot) &&
      // See https://github.com/elastic/kibana/issues/199401
      // for more information on this check...
      ['is null', 'is not null'].includes(expressionRoot.name)
    )
  ) {
    return 'after_not';
  }

  if (expressionRoot) {
    if (
      isColumnItem(expressionRoot) &&
      // and not directly after the column name or prefix e.g. "colu/"
      // we are escaping the column name here as it may contain special characters such as ??
      !new RegExp(`${escapeRegExp(expressionRoot.parts.join('\\.'))}$`).test(innerText)
    ) {
      return 'after_column';
    }

    if (isFunctionItem(expressionRoot) && expressionRoot.subtype === 'variadic-call') {
      return 'after_function';
    }

    if (isFunctionItem(expressionRoot) && expressionRoot.subtype !== 'variadic-call') {
      return 'after_operator';
    }

    if (isLiteralItem(expressionRoot) || isTimeIntervalItem(expressionRoot)) {
      return 'after_literal';
    }
  }

  return 'empty_expression';
};

/**
 * Creates suggestion within an expression.
 *
 * TODO — should this function know about the command context
 * or would we prefer a set of generic configuration options?
 *
 * @param param0
 * @returns
 */
export async function suggestForExpression({
  expressionRoot,
  innerText,
  getExpressionType,
  getColumnsByType,
  previousCommands,
  location,
  preferredExpressionType,
}: {
  expressionRoot: ESQLSingleAstItem | undefined;
  location: Location;
  preferredExpressionType?: SupportedDataType;
} & Pick<
  CommandSuggestParams<string>,
  'innerText' | 'getExpressionType' | 'getColumnsByType' | 'previousCommands'
>): Promise<SuggestionRawDefinition[]> {
  const suggestions: SuggestionRawDefinition[] = [];

  const position = getExpressionPosition(innerText, expressionRoot);
  switch (position) {
    /**
     * After a literal, column, or complete (non-operator) function call
     */
    case 'after_literal':
    case 'after_column':
    case 'after_function':
      const expressionType = getExpressionType(expressionRoot);

      if (!isParameterType(expressionType)) {
        break;
      }

      suggestions.push(
        ...getOperatorSuggestions({
          location,
          // In case of a param literal, we don't know the type of the left operand
          // so we can only suggest operators that accept any type as a left operand
          leftParamType: isParamExpressionType(expressionType) ? undefined : expressionType,
          ignored: ['='],
        })
      );

      break;

    /**
     * After a NOT keyword
     *
     * the NOT function is a special operator that can be used in different ways,
     * and not all these are mapped within the AST data structure: in particular
     * <COMMAND> <field> NOT <here>
     * is an incomplete statement and it results in a missing AST node, so we need to detect
     * from the query string itself
     *
     * (this comment was copied but seems to still apply)
     */
    case 'after_not':
      if (expressionRoot && isFunctionItem(expressionRoot) && expressionRoot.name === 'not') {
        suggestions.push(
          ...getFunctionSuggestions({ location, returnTypes: ['boolean'] }),
          ...(await getColumnsByType('boolean', [], { advanceCursor: true, openSuggestions: true }))
        );
      } else {
        suggestions.push(...getSuggestionsAfterNot());
      }

      break;

    /**
     * After an operator (e.g. AND, OR, IS NULL, +, etc.)
     */
    case 'after_operator':
      if (!expressionRoot) {
        break;
      }

      if (!isFunctionItem(expressionRoot) || expressionRoot.subtype === 'variadic-call') {
        // this is already guaranteed in the getPosition function, but TypeScript doesn't know
        break;
      }

      let rightmostOperator = expressionRoot;
      // get rightmost function
      const walker = new Walker({
        visitFunction: (fn: ESQLFunction) => {
          if (fn.location.min > rightmostOperator.location.min && fn.subtype !== 'variadic-call')
            rightmostOperator = fn;
        },
      });
      walker.walkFunction(expressionRoot);

      // See https://github.com/elastic/kibana/issues/199401 for an explanation of
      // why this check has to be so convoluted
      if (rightmostOperator.text.toLowerCase().trim().endsWith('null')) {
        suggestions.push(...logicalOperators.map(getOperatorSuggestion));
        break;
      }

      suggestions.push(
        ...(await getSuggestionsToRightOfOperatorExpression({
          queryText: innerText,
          location,
          rootOperator: rightmostOperator,
          preferredExpressionType,
          getExpressionType,
          getColumnsByType,
        }))
      );

      break;

    case 'empty_expression':
      // Don't suggest MATCH, QSTR or KQL after unsupported commands
      const priorCommands = previousCommands?.map((a) => a.name) ?? [];
      const ignored = [];
      if (priorCommands.some((c) => UNSUPPORTED_COMMANDS_BEFORE_MATCH.has(c))) {
        ignored.push('match');
      }
      if (priorCommands.some((c) => UNSUPPORTED_COMMANDS_BEFORE_QSTR.has(c))) {
        ignored.push('kql', 'qstr');
      }
      const last = previousCommands?.[previousCommands.length - 1];
      let columnSuggestions: SuggestionRawDefinition[] = [];
      if (!last?.text?.endsWith(`:${EDITOR_MARKER}`)) {
        columnSuggestions = await getColumnsByType('any', [], {
          advanceCursor: true,
          openSuggestions: true,
        });
      }
      suggestions.push(
        ...pushItUpInTheList(columnSuggestions, true),
        ...getFunctionSuggestions({ location, ignored })
      );

      break;
  }

  /**
   * Attach replacement ranges if there's a prefix.
   *
   * Can't rely on Monaco because
   * - it counts "." as a word separator
   * - it doesn't handle multi-word completions (like "is null")
   *
   * TODO - think about how to generalize this — issue: https://github.com/elastic/kibana/issues/209905
   */
  const hasNonWhitespacePrefix = !/\s/.test(innerText[innerText.length - 1]);
  suggestions.forEach((s) => {
    if (['IS NULL', 'IS NOT NULL'].includes(s.text)) {
      // this suggestion has spaces in it (e.g. "IS NOT NULL")
      // so we need to see if there's an overlap
      s.rangeToReplace = getOverlapRange(innerText, s.text);
      return;
    } else if (hasNonWhitespacePrefix) {
      // get index of first char of final word
      const lastNonWhitespaceIndex = innerText.search(/\S(?=\S*$)/);
      s.rangeToReplace = {
        start: lastNonWhitespaceIndex,
        end: innerText.length,
      };
    }
  });

  return suggestions;
}

/**
 * Builds a regex that matches partial strings starting
 * from the beginning of the string.
 *
 * Example:
 * "is null" -> /^i(?:s(?:\s+(?:n(?:u(?:l(?:l)?)?)?)?)?)?$/i
 */
export function buildPartialMatcher(str: string) {
  // Split the string into characters
  const chars = str.split('');

  // Initialize the regex pattern
  let pattern = '';

  // Iterate through the characters and build the pattern
  chars.forEach((char, index) => {
    if (char === ' ') {
      pattern += '\\s+';
    } else {
      pattern += char;
    }
    if (index < chars.length - 1) {
      pattern += '(?:';
    }
  });

  // Close the non-capturing groups
  for (let i = 0; i < chars.length - 1; i++) {
    pattern += ')?';
  }

  // Return the final regex pattern
  return new RegExp(pattern + '$', 'i');
}

const isNullMatcher = buildPartialMatcher('is nul');
const isNotNullMatcher = buildPartialMatcher('is not nul');

/**
 * Checks whether an expression is truly complete.
 *
 * (Encapsulates handling of the "is null" and "is not null"
 * checks)
 *
 * @todo use the simpler "getExpressionType(root) !== 'unknown'"
 * as soon as https://github.com/elastic/kibana/issues/199401 is resolved
 */
export function isExpressionComplete(
  expressionType: SupportedDataType | 'unknown',
  innerText: string
) {
  return (
    expressionType !== 'unknown' &&
    // see https://github.com/elastic/kibana/issues/199401
    // for the reason we need this string check.
    !(isNullMatcher.test(innerText) || isNotNullMatcher.test(innerText))
  );
}

export function getSourceSuggestions(sources: ESQLSourceResult[], alreadyUsed: string[]) {
  // hide indexes that start with .
  return buildSourcesDefinitions(
    sources
      .filter(({ hidden, name }) => !hidden && !alreadyUsed.includes(name))
      .map(({ name, dataStreams, title, type }) => {
        return { name, isIntegration: Boolean(dataStreams && dataStreams.length), title, type };
      })
  );
}

export async function additionalSourcesSuggestions(
  queryText: string,
  sources: ESQLSourceResult[],
  ignored: string[],
  recommendedQuerySuggestions: SuggestionRawDefinition[]
) {
  const suggestionsToAdd = await handleFragment(
    queryText,
    (fragment) =>
      sourceExists(fragment, new Set(sources.map(({ name: sourceName }) => sourceName))),
    (_fragment, rangeToReplace) => {
      return getSourceSuggestions(sources, ignored).map((suggestion) => ({
        ...suggestion,
        rangeToReplace,
      }));
    },
    (fragment, rangeToReplace) => {
      const exactMatch = sources.find(({ name: _name }) => _name === fragment);
      if (exactMatch?.dataStreams) {
        // this is an integration name, suggest the datastreams
        const definitions = buildSourcesDefinitions(
          exactMatch.dataStreams.map(({ name }) => ({ name, isIntegration: false }))
        );

        return definitions;
      } else {
        const _suggestions: SuggestionRawDefinition[] = [
          {
            ...pipeCompleteItem,
            filterText: fragment,
            text: fragment + ' | ',
            command: TRIGGER_SUGGESTION_COMMAND,
            rangeToReplace,
          },
          {
            ...commaCompleteItem,
            filterText: fragment,
            text: fragment + ', ',
            command: TRIGGER_SUGGESTION_COMMAND,
            rangeToReplace,
          },
          {
            ...metadataSuggestion,
            filterText: fragment,
            text: fragment + ' METADATA ',
            rangeToReplace,
          },
          ...recommendedQuerySuggestions.map((suggestion) => ({
            ...suggestion,
            rangeToReplace,
            filterText: fragment,
            text: fragment + suggestion.text,
          })),
        ];
        return _suggestions;
      }
    }
  );
  return suggestionsToAdd;
}

// Treating lookup and time_series mode indices
export const specialIndicesToSuggestions = (
  indices: IndexAutocompleteItem[]
): SuggestionRawDefinition[] => {
  const mainSuggestions: SuggestionRawDefinition[] = [];
  const aliasSuggestions: SuggestionRawDefinition[] = [];

  for (const index of indices) {
    mainSuggestions.push({
      label: index.name,
      text: index.name + ' ',
      kind: 'Issue',
      detail: i18n.translate(
        'kbn-esql-validation-autocomplete.esql.autocomplete.specialIndexes.indexType.index',
        {
          defaultMessage: 'Index',
        }
      ),
      sortText: '0-INDEX-' + index.name,
      command: TRIGGER_SUGGESTION_COMMAND,
    });

    if (index.aliases) {
      for (const alias of index.aliases) {
        aliasSuggestions.push({
          label: alias,
          text: alias + ' $0',
          kind: 'Issue',
          detail: i18n.translate(
            'kbn-esql-validation-autocomplete.esql.autocomplete.specialIndexes.indexType.alias',
            {
              defaultMessage: 'Alias',
            }
          ),
          sortText: '1-ALIAS-' + alias,
          command: TRIGGER_SUGGESTION_COMMAND,
        });
      }
    }
  }

  return [...mainSuggestions, ...aliasSuggestions];
};
