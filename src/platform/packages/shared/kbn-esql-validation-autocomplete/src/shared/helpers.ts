/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  Walker,
  type ESQLAstItem,
  type ESQLColumn,
  type ESQLCommandMode,
  type ESQLCommandOption,
  type ESQLFunction,
  type ESQLLiteral,
  type ESQLSingleAstItem,
  type ESQLSource,
  type ESQLTimeInterval,
} from '@kbn/esql-ast';
import {
  ESQLIdentifier,
  ESQLInlineCast,
  ESQLParamLiteral,
  ESQLProperNode,
} from '@kbn/esql-ast/src/types';
import { aggregationFunctionDefinitions } from '../definitions/generated/aggregation_functions';
import { builtinFunctions } from '../definitions/builtin';
import { commandDefinitions } from '../definitions/commands';
import { scalarFunctionDefinitions } from '../definitions/generated/scalar_functions';
import { groupingFunctionDefinitions } from '../definitions/generated/grouping_functions';
import { getTestFunctions } from './test_functions';
import { getFunctionSignatures } from '../definitions/helpers';
import { timeUnits } from '../definitions/literals';
import {
  byOption,
  metadataOption,
  asOption,
  onOption,
  withOption,
  appendSeparatorOption,
} from '../definitions/options';
import {
  CommandDefinition,
  CommandOptionsDefinition,
  FunctionParameter,
  FunctionDefinition,
  FunctionParameterType,
  FunctionReturnType,
  ArrayType,
  SupportedDataType,
} from '../definitions/types';
import type { ESQLRealField, ESQLVariable, ReferenceMaps } from '../validation/types';
import { removeMarkerArgFromArgsList } from './context';
import type { ReasonTypes } from './types';
import { DOUBLE_TICKS_REGEX, EDITOR_MARKER, SINGLE_BACKTICK } from './constants';
import type { EditorContext } from '../autocomplete/types';

export function nonNullable<T>(v: T): v is NonNullable<T> {
  return v != null;
}

export function isSingleItem(arg: ESQLAstItem): arg is ESQLSingleAstItem {
  return arg && !Array.isArray(arg);
}

export function isSettingItem(arg: ESQLAstItem): arg is ESQLCommandMode {
  return isSingleItem(arg) && arg.type === 'mode';
}
export function isFunctionItem(arg: ESQLAstItem): arg is ESQLFunction {
  return isSingleItem(arg) && arg.type === 'function';
}

export function isOptionItem(arg: ESQLAstItem): arg is ESQLCommandOption {
  return isSingleItem(arg) && arg.type === 'option';
}

export function isSourceItem(arg: ESQLAstItem): arg is ESQLSource {
  return isSingleItem(arg) && arg.type === 'source';
}

export function isColumnItem(arg: ESQLAstItem): arg is ESQLColumn {
  return isSingleItem(arg) && arg.type === 'column';
}

export function isLiteralItem(arg: ESQLAstItem): arg is ESQLLiteral {
  return isSingleItem(arg) && arg.type === 'literal';
}

export function isInlineCastItem(arg: ESQLAstItem): arg is ESQLInlineCast {
  return isSingleItem(arg) && arg.type === 'inlineCast';
}

export function isTimeIntervalItem(arg: ESQLAstItem): arg is ESQLTimeInterval {
  return isSingleItem(arg) && arg.type === 'timeInterval';
}

export function isAssignment(arg: ESQLAstItem): arg is ESQLFunction {
  return isFunctionItem(arg) && arg.name === '=';
}

export function isAssignmentComplete(node: ESQLFunction | undefined) {
  const assignExpression = removeMarkerArgFromArgsList(node)?.args?.[1];
  return Boolean(assignExpression && Array.isArray(assignExpression) && assignExpression.length);
}

export function isIncompleteItem(arg: ESQLAstItem): boolean {
  return !arg || (!Array.isArray(arg) && arg.incomplete);
}

export function isMathFunction(query: string, offset: number) {
  const queryTrimmed = query.trimEnd();
  // try to get the full operation token (e.g. "+", "in", "like", etc...) but it requires the token
  // to be spaced out from a field/function (e.g. "field + ") so it is subject to issues
  const [opString] = queryTrimmed.split(' ').reverse();
  // compare last char for all math functions
  // limit only to 2 chars operators
  const fns = builtinFunctions.filter(({ name }) => name.length < 3).map(({ name }) => name);
  const tokenMatch = fns.some((op) => opString === op);
  // there's a match, that's good
  if (tokenMatch) {
    return true;
  }
  // either there's no match or it is the case where field/function and op are not spaced out
  // e.g "field+" or "fn()+"
  // so try to extract the last char and compare it with the single char math functions
  const singleCharFns = fns.filter((name) => name.length === 1);
  return singleCharFns.some((c) => c === opString[opString.length - 1]);
}

export function isComma(char: string) {
  return char === ',';
}

export function isSourceCommand({ label }: { label: string }) {
  return ['FROM', 'ROW', 'SHOW', 'METRICS'].includes(label);
}

let fnLookups: Map<string, FunctionDefinition> | undefined;
let commandLookups: Map<string, CommandDefinition<string>> | undefined;

function buildFunctionLookup() {
  // we always refresh if we have test functions
  if (!fnLookups || getTestFunctions().length) {
    fnLookups = builtinFunctions
      .concat(
        scalarFunctionDefinitions,
        aggregationFunctionDefinitions,
        groupingFunctionDefinitions,
        getTestFunctions()
      )
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

export function isSupportedFunction(
  name: string,
  parentCommand?: string,
  option?: string
): { supported: boolean; reason: ReasonTypes | undefined } {
  if (!parentCommand) {
    return {
      supported: false,
      reason: 'missingCommand',
    };
  }
  const fn = buildFunctionLookup().get(name);
  const isSupported = Boolean(
    option == null
      ? fn?.supportedCommands.includes(parentCommand)
      : fn?.supportedOptions?.includes(option)
  );
  return {
    supported: isSupported,
    reason: isSupported ? undefined : fn ? 'unsupportedFunction' : 'unknownFunction',
  };
}

export function getAllFunctions(options?: {
  type: Array<FunctionDefinition['type']> | FunctionDefinition['type'];
}) {
  const fns = buildFunctionLookup();
  if (!options?.type) {
    return Array.from(fns.values());
  }
  const types = new Set(Array.isArray(options.type) ? options.type : [options.type]);
  return Array.from(fns.values()).filter((fn) => types.has(fn.type));
}

export function getFunctionDefinition(name: string) {
  return buildFunctionLookup().get(name.toLowerCase());
}

const unwrapStringLiteralQuotes = (value: string) => value.slice(1, -1);

function buildCommandLookup(): Map<string, CommandDefinition<string>> {
  if (!commandLookups) {
    commandLookups = commandDefinitions.reduce((memo, def) => {
      memo.set(def.name, def);
      if (def.alias) {
        memo.set(def.alias, def);
      }
      return memo;
    }, new Map<string, CommandDefinition<string>>());
  }
  return commandLookups!;
}

export function getCommandDefinition(name: string): CommandDefinition<string> {
  return buildCommandLookup().get(name.toLowerCase())!;
}

export function getAllCommands() {
  return Array.from(buildCommandLookup().values());
}

export function getCommandOption(optionName: CommandOptionsDefinition<string>['name']) {
  return [byOption, metadataOption, asOption, onOption, withOption, appendSeparatorOption].find(
    ({ name }) => name === optionName
  );
}

function doesLiteralMatchParameterType(argType: FunctionParameterType, item: ESQLLiteral) {
  if (item.literalType === argType) {
    return true;
  }

  if (item.literalType === 'null') {
    // all parameters accept null, but this is not yet reflected
    // in our function definitions so we let it through here
    return true;
  }

  // some parameters accept string literals because of ES auto-casting
  if (
    item.literalType === 'keyword' &&
    (argType === 'date' ||
      argType === 'date_period' ||
      argType === 'version' ||
      argType === 'ip' ||
      argType === 'boolean')
  ) {
    return true;
  }

  return false;
}

/**
 * This function returns the variable or field matching a column
 */
export function getColumnForASTNode(
  node: ESQLColumn | ESQLIdentifier,
  { fields, variables }: Pick<ReferenceMaps, 'fields' | 'variables'>
): ESQLRealField | ESQLVariable | undefined {
  const formatted = node.type === 'identifier' ? node.name : node.parts.join('.');
  return getColumnByName(formatted, { fields, variables });
}

/**
 * This function returns the variable or field matching a column
 */
export function getColumnByName(
  columnName: string,
  { fields, variables }: Pick<ReferenceMaps, 'fields' | 'variables'>
): ESQLRealField | ESQLVariable | undefined {
  // TODO this doesn't cover all escaping scenarios... the best thing to do would be
  // to use the AST column node parts array, but in some cases the AST node isn't available.
  if (columnName.startsWith(SINGLE_BACKTICK) && columnName.endsWith(SINGLE_BACKTICK)) {
    columnName = columnName.slice(1, -1).replace(DOUBLE_TICKS_REGEX, SINGLE_BACKTICK);
  }
  return fields.get(columnName) || variables.get(columnName)?.[0];
}

const ARRAY_REGEXP = /\[\]$/;

export function isArrayType(type: string): type is ArrayType {
  return ARRAY_REGEXP.test(type);
}

const arrayToSingularMap: Map<ArrayType, FunctionParameterType> = new Map([
  ['double[]', 'double'],
  ['unsigned_long[]', 'unsigned_long'],
  ['long[]', 'long'],
  ['integer[]', 'integer'],
  ['counter_integer[]', 'counter_integer'],
  ['counter_long[]', 'counter_long'],
  ['counter_double[]', 'counter_double'],
  ['keyword[]', 'keyword'],
  ['text[]', 'text'],
  ['date[]', 'date'],
  ['date_period[]', 'date_period'],
  ['boolean[]', 'boolean'],
  ['any[]', 'any'],
]);

/**
 * Given an array type for example `string[]` it will return `string`
 */
export function extractSingularType(type: FunctionParameterType): FunctionParameterType {
  return isArrayType(type) ? arrayToSingularMap.get(type)! : type;
}

export function createMapFromList<T extends { name: string }>(arr: T[]): Map<string, T> {
  const arrMap = new Map<string, T>();
  for (const item of arr) {
    arrMap.set(item.name, item);
  }
  return arrMap;
}

export function areFieldAndVariableTypesCompatible(
  fieldType: string | string[] | undefined,
  variableType: string | string[]
) {
  if (fieldType == null) {
    return false;
  }
  return fieldType === variableType;
}

export function printFunctionSignature(arg: ESQLFunction): string {
  const fnDef = getFunctionDefinition(arg.name);
  if (fnDef) {
    const signature = getFunctionSignatures(
      {
        ...fnDef,
        signatures: [
          {
            ...fnDef?.signatures[0],
            params: arg.args.map((innerArg) =>
              Array.isArray(innerArg)
                ? { name: `InnerArgument[]`, type: 'any' as const }
                : // this cast isn't actually correct, but we're abusing the
                  // getFunctionSignatures API anyways
                  { name: innerArg.text, type: innerArg.type as FunctionParameterType }
            ),
            // this cast isn't actually correct, but we're abusing the
            // getFunctionSignatures API anyways
            returnType: '' as FunctionReturnType,
          },
        ],
      },
      { withTypes: false, capitalize: true }
    );
    return signature[0].declaration;
  }
  return '';
}

export function getAllArrayValues(arg: ESQLAstItem) {
  const values: string[] = [];
  if (Array.isArray(arg)) {
    for (const subArg of arg) {
      if (Array.isArray(subArg)) {
        break;
      }
      if (subArg.type === 'literal') {
        values.push(String(subArg.value));
      }
      if (isColumnItem(subArg) || isTimeIntervalItem(subArg)) {
        values.push(subArg.name);
      }
      if (subArg.type === 'function') {
        const signature = printFunctionSignature(subArg);
        if (signature) {
          values.push(signature);
        }
      }
    }
  }
  return values;
}

export function getAllArrayTypes(
  arg: ESQLAstItem,
  parentCommand: string,
  references: ReferenceMaps
) {
  const types = [];
  if (Array.isArray(arg)) {
    for (const subArg of arg) {
      if (Array.isArray(subArg)) {
        break;
      }
      if (subArg.type === 'literal') {
        types.push(subArg.literalType);
      }
      if (subArg.type === 'column') {
        const hit = getColumnForASTNode(subArg, references);
        types.push(hit?.type || 'unsupported');
      }
      if (subArg.type === 'timeInterval') {
        types.push('time_literal');
      }
      if (subArg.type === 'function') {
        if (isSupportedFunction(subArg.name, parentCommand).supported) {
          const fnDef = buildFunctionLookup().get(subArg.name)!;
          types.push(fnDef.signatures[0].returnType);
        }
      }
    }
  }
  return types;
}

export function inKnownTimeInterval(timeIntervalUnit: string): boolean {
  return timeUnits.some((unit) => unit === timeIntervalUnit.toLowerCase());
}

/**
 * Checks if this argument is one of the possible options
 * if they are defined on the arg definition.
 *
 * TODO - Consider merging with isEqualType to create a unified arg validation function
 */
export function isValidLiteralOption(arg: ESQLLiteral, argDef: FunctionParameter) {
  return (
    arg.literalType === 'keyword' &&
    argDef.acceptedValues &&
    !argDef.acceptedValues
      .map((option) => option.toLowerCase())
      .includes(unwrapStringLiteralQuotes(arg.value).toLowerCase())
  );
}

/**
 * Checks if an AST function argument is of the correct type
 * given the definition.
 */
export function checkFunctionArgMatchesDefinition(
  arg: ESQLSingleAstItem,
  parameterDefinition: FunctionParameter,
  references: ReferenceMaps,
  parentCommand?: string
) {
  const argType = parameterDefinition.type;
  if (argType === 'any') {
    return true;
  }
  if (isParam(arg)) {
    return true;
  }
  if (arg.type === 'literal') {
    const matched = doesLiteralMatchParameterType(argType, arg);
    return matched;
  }
  if (arg.type === 'function') {
    if (isSupportedFunction(arg.name, parentCommand).supported) {
      const fnDef = buildFunctionLookup().get(arg.name)!;
      return fnDef.signatures.some(
        (signature) => signature.returnType === 'unknown' || argType === signature.returnType
      );
    }
  }
  if (arg.type === 'timeInterval') {
    return argType === 'time_literal' && inKnownTimeInterval(arg.unit);
  }
  if (arg.type === 'column') {
    const hit = getColumnForASTNode(arg, references);
    const validHit = hit;
    if (!validHit) {
      return false;
    }
    const wrappedTypes: Array<(typeof validHit)['type']> = Array.isArray(validHit.type)
      ? validHit.type
      : [validHit.type];

    return wrappedTypes.some((ct) => ct === argType || ct === 'null' || ct === 'unknown');
  }
  if (arg.type === 'inlineCast') {
    const lowerArgType = argType?.toLowerCase();
    const castedType = getExpressionType(arg);
    return castedType === lowerArgType;
  }
}

function fuzzySearch(fuzzyName: string, resources: IterableIterator<string>) {
  const wildCardPosition = getWildcardPosition(fuzzyName);
  if (wildCardPosition !== 'none') {
    const matcher = getMatcher(fuzzyName, wildCardPosition);
    for (const resourceName of resources) {
      if (matcher(resourceName)) {
        return true;
      }
    }
  }
}

function getMatcher(name: string, position: 'start' | 'end' | 'middle' | 'multiple-within') {
  if (position === 'start') {
    const prefix = name.substring(1);
    return (resource: string) => resource.endsWith(prefix);
  }
  if (position === 'end') {
    const prefix = name.substring(0, name.length - 1);
    return (resource: string) => resource.startsWith(prefix);
  }
  if (position === 'multiple-within') {
    // make sure to remove the * at the beginning of the name if present
    const safeName = name.startsWith('*') ? name.slice(1) : name;
    // replace 2 ore more consecutive wildcards with a single one
    const setOfChars = safeName.replace(/\*{2+}/g, '*').split('*');
    return (resource: string) => {
      let index = -1;
      return setOfChars.every((char) => {
        index = resource.indexOf(char, index + 1);
        return index !== -1;
      });
    };
  }
  const [prefix, postFix] = name.split('*');
  return (resource: string) => resource.startsWith(prefix) && resource.endsWith(postFix);
}

function getWildcardPosition(name: string) {
  if (!hasWildcard(name)) {
    return 'none';
  }
  const wildCardCount = name.match(/\*/g)!.length;
  if (wildCardCount > 1) {
    return 'multiple-within';
  }
  if (name.startsWith('*')) {
    return 'start';
  }
  if (name.endsWith('*')) {
    return 'end';
  }
  return 'middle';
}

export function hasWildcard(name: string) {
  return /\*/.test(name);
}
export function isVariable(
  column: ESQLRealField | ESQLVariable | undefined
): column is ESQLVariable {
  return Boolean(column && 'location' in column);
}

/**
 * This returns the name with any quotes that were present.
 *
 * E.g. "`bytes`" will be "`bytes`"
 *
 * @param node
 * @returns
 */
export const getQuotedColumnName = (node: ESQLColumn | ESQLIdentifier) =>
  node.type === 'identifier' ? node.name : node.quoted ? node.text : node.name;

/**
 * TODO - consider calling lookupColumn under the hood of this function. Seems like they should really do the same thing.
 */
export function getColumnExists(
  node: ESQLColumn | ESQLIdentifier,
  { fields, variables }: Pick<ReferenceMaps, 'fields' | 'variables'>
) {
  const columnName = node.type === 'identifier' ? node.name : node.parts.join('.');
  if (fields.has(columnName) || variables.has(columnName)) {
    return true;
  }

  // TODO — I don't see this fuzzy searching in lookupColumn... should it be there?
  if (
    Boolean(fuzzySearch(columnName, fields.keys()) || fuzzySearch(columnName, variables.keys()))
  ) {
    return true;
  }

  return false;
}

export function sourceExists(index: string, sources: Set<string>) {
  if (sources.has(index) || index.startsWith('-')) {
    return true;
  }
  return Boolean(fuzzySearch(index, sources.keys()));
}

/**
 * Works backward from the cursor position to determine if
 * the final character of the previous word matches the given character.
 */
function characterPrecedesCurrentWord(text: string, char: string) {
  let inCurrentWord = true;
  for (let i = text.length - 1; i >= 0; i--) {
    if (inCurrentWord && /\s/.test(text[i])) {
      inCurrentWord = false;
    }

    if (!inCurrentWord && !/\s/.test(text[i])) {
      return text[i] === char;
    }
  }
}

export function pipePrecedesCurrentWord(text: string) {
  return characterPrecedesCurrentWord(text, '|');
}

export function getLastNonWhitespaceChar(text: string) {
  return text[text.trimEnd().length - 1];
}

/**
 * Are we after a comma? i.e. STATS fieldA, <here>
 */
export function isRestartingExpression(text: string) {
  return getLastNonWhitespaceChar(text) === ',' || characterPrecedesCurrentWord(text, ',');
}

export function findPreviousWord(text: string) {
  const words = text.split(/\s+/);
  return words[words.length - 2];
}

export function endsInWhitespace(text: string) {
  return /\s$/.test(text);
}

/**
 * Returns the word at the end of the text if there is one.
 * @param text
 * @returns
 */
export function findFinalWord(text: string) {
  const words = text.split(/\s+/);
  return words[words.length - 1];
}

export function shouldBeQuotedSource(text: string) {
  // Based on lexer `fragment UNQUOTED_SOURCE_PART`
  return /[:"=|,[\]\/ \t\r\n]/.test(text);
}
export function shouldBeQuotedText(
  text: string,
  { dashSupported }: { dashSupported?: boolean } = {}
) {
  return dashSupported ? /[^a-zA-Z\d_\.@-]/.test(text) : /[^a-zA-Z\d_\.@]/.test(text);
}

export const isAggFunction = (arg: ESQLFunction): boolean =>
  getFunctionDefinition(arg.name)?.type === 'agg';

export const isParam = (x: unknown): x is ESQLParamLiteral =>
  !!x &&
  typeof x === 'object' &&
  (x as ESQLParamLiteral).type === 'literal' &&
  (x as ESQLParamLiteral).literalType === 'param';

export const isFunctionOperatorParam = (fn: ESQLFunction): boolean =>
  !!fn.operator && isParam(fn.operator);

/**
 * Returns `true` if the function is an aggregation function or a function
 * name is a parameter, which potentially could be an aggregation function.
 */
export const isMaybeAggFunction = (fn: ESQLFunction): boolean =>
  isAggFunction(fn) || isFunctionOperatorParam(fn);

export const isParametrized = (node: ESQLProperNode): boolean => Walker.params(node).length > 0;

/**
 * Compares two strings in a case-insensitive manner
 */
export const noCaseCompare = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * This function returns a list of closing brackets that can be appended to 
 * a partial query to make it valid.

* locally fix the queryString to generate a valid AST
 * A known limitation of this is that is not aware of commas "," or pipes "|"
 * so it is not yet helpful on a multiple commands errors (a workaround it to pass each command here...)
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
      if (substr === openBracket) {
        stack.push(substr);
        break;
      } else if (pairsReversed[substr] && pairsReversed[substr] === stack[stack.length - 1]) {
        stack.pop();
        break;
      }
    }
  }
  return stack.reverse().map((bracket) => pairs[bracket]);
}

/**
 * This function counts the number of unclosed parentheses
 * @param text
 */
export function countUnclosedParens(text: string) {
  let unclosedCount = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ')' && unclosedCount > 0) {
      unclosedCount--;
    } else if (text[i] === '(') {
      unclosedCount++;
    }
  }
  return unclosedCount;
}

/**
 * This function attempts to correct the syntax of a partial query to make it valid.
 *
 * This is important because a syntactically-invalid query will not generate a good AST.
 *
 * @param _query
 * @param context
 * @returns
 */
export function correctQuerySyntax(_query: string, context: EditorContext) {
  let query = _query;
  // check if all brackets are closed, otherwise close them
  const bracketsToAppend = getBracketsToClose(query);
  const unclosedRoundBracketCount = bracketsToAppend.filter((bracket) => bracket === ')').length;
  // if it's a comma by the user or a forced trigger by a function argument suggestion
  // add a marker to make the expression still valid
  const charThatNeedMarkers = [',', ':'];
  if (
    (context.triggerCharacter && charThatNeedMarkers.includes(context.triggerCharacter)) ||
    // monaco.editor.CompletionTriggerKind['Invoke'] === 0
    (context.triggerKind === 0 && unclosedRoundBracketCount === 0) ||
    (context.triggerCharacter === ' ' && isMathFunction(query, query.length)) ||
    isComma(query.trimEnd()[query.trimEnd().length - 1])
  ) {
    query += EDITOR_MARKER;
  }

  query += bracketsToAppend.join('');

  return query;
}

/**
 * Gets the signatures of a function that match the number of arguments
 * provided in the AST.
 */
export function getSignaturesWithMatchingArity(
  fnDef: FunctionDefinition,
  astFunction: ESQLFunction
) {
  return fnDef.signatures.filter((def) => {
    if (def.minParams) {
      return astFunction.args.length >= def.minParams;
    }
    return (
      astFunction.args.length >= def.params.filter(({ optional }) => !optional).length &&
      astFunction.args.length <= def.params.length
    );
  });
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
 * Determines the type of the expression
 */
export function getExpressionType(
  root: ESQLAstItem | undefined,
  fields?: Map<string, ESQLRealField>,
  variables?: Map<string, ESQLVariable[]>
): SupportedDataType | 'unknown' {
  if (!root) {
    return 'unknown';
  }

  if (!isSingleItem(root)) {
    if (root.length === 0) {
      return 'unknown';
    }
    return getExpressionType(root[0], fields, variables);
  }

  if (isLiteralItem(root) && root.literalType !== 'param') {
    return root.literalType;
  }

  if (isTimeIntervalItem(root)) {
    return 'time_literal';
  }

  // from https://github.com/elastic/elasticsearch/blob/122e7288200ee03e9087c98dff6cebbc94e774aa/docs/reference/esql/functions/kibana/inline_cast.json
  if (isInlineCastItem(root)) {
    switch (root.castType) {
      case 'int':
        return 'integer';
      case 'bool':
        return 'boolean';
      case 'string':
        return 'keyword';
      case 'text':
        return 'keyword';
      case 'datetime':
        return 'date';
      default:
        return root.castType;
    }
  }

  if (isColumnItem(root) && fields && variables) {
    const column = getColumnForASTNode(root, { fields, variables });
    if (!column) {
      return 'unknown';
    }
    return column.type;
  }

  if (root.type === 'list') {
    return getExpressionType(root.values[0], fields, variables);
  }

  if (isFunctionItem(root)) {
    const fnDefinition = getFunctionDefinition(root.name);
    if (!fnDefinition) {
      return 'unknown';
    }

    /**
     * Special case for COUNT(*) because
     * the "*" column doesn't match any
     * of COUNT's function definitions
     */
    if (
      fnDefinition.name === 'count' &&
      root.args[0] &&
      isColumnItem(root.args[0]) &&
      root.args[0].name === '*'
    ) {
      return 'long';
    }

    if (fnDefinition.name === 'case' && root.args.length) {
      /**
       * The CASE function doesn't fit our system of function definitions
       * and needs special handling. This is imperfect, but it's a start because
       * at least we know that the final argument to case will never be a conditional
       * expression, always a result expression.
       *
       * One problem with this is that if a false case is not provided, the return type
       * will be null, which we aren't detecting. But this is ok because we consider
       * variables and fields to be nullable anyways and account for that during validation.
       */
      return getExpressionType(root.args[root.args.length - 1], fields, variables);
    }

    const signaturesWithCorrectArity = getSignaturesWithMatchingArity(fnDefinition, root);

    if (!signaturesWithCorrectArity.length) {
      return 'unknown';
    }

    const argTypes = root.args.map((arg) => getExpressionType(arg, fields, variables));

    // When functions are passed null for any argument, they generally return null
    // This is a special case that is not reflected in our function definitions
    if (argTypes.some((argType) => argType === 'null')) return 'null';

    const matchingSignature = signaturesWithCorrectArity.find((signature) => {
      return argTypes.every((argType, i) => {
        const param = getParamAtPosition(signature, i);
        return (
          param &&
          (param.type === 'any' ||
            param.type === argType ||
            (argType === 'keyword' && ['date', 'date_period'].includes(param.type)))
        );
      });
    });

    if (!matchingSignature) {
      return 'unknown';
    }

    return matchingSignature.returnType === 'any' ? 'unknown' : matchingSignature.returnType;
  }

  return 'unknown';
}
