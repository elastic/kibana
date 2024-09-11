/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ESQLAstItem,
  ESQLColumn,
  ESQLCommandMode,
  ESQLCommandOption,
  ESQLFunction,
  ESQLLiteral,
  ESQLSingleAstItem,
  ESQLSource,
  ESQLTimeInterval,
} from '@kbn/esql-ast';
import { ESQLInlineCast, ESQLParamLiteral } from '@kbn/esql-ast/src/types';
import { aggregationFunctionDefinitions } from '../definitions/generated/aggregation_functions';
import { builtinFunctions } from '../definitions/builtin';
import { commandDefinitions } from '../definitions/commands';
import { scalarFunctionDefinitions } from '../definitions/generated/scalar_functions';
import { groupingFunctionDefinitions } from '../definitions/grouping';
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
} from '../definitions/types';
import type { ESQLRealField, ESQLVariable, ReferenceMaps } from '../validation/types';
import { removeMarkerArgFromArgsList } from './context';
import { isNumericDecimalType } from './esql_types';
import type { ReasonTypes } from './types';

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

export function isExpression(arg: ESQLAstItem): arg is ESQLFunction {
  return isFunctionItem(arg) && arg.name !== '=';
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
let commandLookups: Map<string, CommandDefinition> | undefined;

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

function buildCommandLookup() {
  if (!commandLookups) {
    commandLookups = commandDefinitions.reduce((memo, def) => {
      memo.set(def.name, def);
      if (def.alias) {
        memo.set(def.alias, def);
      }
      return memo;
    }, new Map<string, CommandDefinition>());
  }
  return commandLookups;
}

export function getCommandDefinition(name: string): CommandDefinition {
  return buildCommandLookup().get(name.toLowerCase())!;
}

export function getAllCommands() {
  return Array.from(buildCommandLookup().values());
}

export function getCommandOption(optionName: CommandOptionsDefinition['name']) {
  return [byOption, metadataOption, asOption, onOption, withOption, appendSeparatorOption].find(
    ({ name }) => name === optionName
  );
}

function compareLiteralType(argType: string, item: ESQLLiteral) {
  if (item.literalType === 'null') {
    return true;
  }

  if (item.literalType === 'decimal' && isNumericDecimalType(argType)) {
    return true;
  }

  if (item.literalType === 'string' && (argType === 'text' || argType === 'keyword')) {
    return true;
  }

  if (item.literalType !== 'string') {
    if (argType === item.literalType) {
      return true;
    }
    return false;
  }

  // date-type parameters accept string literals because of ES auto-casting
  return ['string', 'date', 'date', 'date_period'].includes(argType);
}

/**
 * This function returns the variable or field matching a column
 */
export function getColumnForASTNode(
  column: ESQLColumn,
  { fields, variables }: Pick<ReferenceMaps, 'fields' | 'variables'>
): ESQLRealField | ESQLVariable | undefined {
  const columnName = getQuotedColumnName(column);
  return (
    getColumnByName(columnName, { fields, variables }) ||
    // It's possible columnName has backticks "`fieldName`"
    // so we need to access the original name as well
    getColumnByName(column.name, { fields, variables })
  );
}

/**
 * This function returns the variable or field matching a column
 */
export function getColumnByName(
  columnName: string,
  { fields, variables }: Pick<ReferenceMaps, 'fields' | 'variables'>
): ESQLRealField | ESQLVariable | undefined {
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

export function inKnownTimeInterval(item: ESQLTimeInterval): boolean {
  return timeUnits.some((unit) => unit === item.unit.toLowerCase());
}

/**
 * Checks if this argument is one of the possible options
 * if they are defined on the arg definition.
 *
 * TODO - Consider merging with isEqualType to create a unified arg validation function
 */
export function isValidLiteralOption(arg: ESQLLiteral, argDef: FunctionParameter) {
  return (
    arg.literalType === 'string' &&
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
  if (argType === 'any' || isParam(arg)) {
    return true;
  }
  if (arg.type === 'literal') {
    const matched = compareLiteralType(argType as string, arg);
    return matched;
  }
  if (arg.type === 'function') {
    if (isSupportedFunction(arg.name, parentCommand).supported) {
      const fnDef = buildFunctionLookup().get(arg.name)!;
      return fnDef.signatures.some(
        (signature) => signature.returnType === 'any' || argType === signature.returnType
      );
    }
  }
  if (arg.type === 'timeInterval') {
    return argType === 'time_literal' && inKnownTimeInterval(arg);
  }
  if (arg.type === 'column') {
    const hit = getColumnForASTNode(arg, references);
    const validHit = hit;
    if (!validHit) {
      return false;
    }
    const wrappedTypes = Array.isArray(validHit.type) ? validHit.type : [validHit.type];
    // if final type is of type any make it pass for now
    return wrappedTypes.some(
      (ct) =>
        ['any', 'null'].includes(ct) ||
        argType === ct ||
        (ct === 'string' && ['text', 'keyword'].includes(argType as string))
    );
  }
  if (arg.type === 'inlineCast') {
    const lowerArgType = argType?.toLowerCase();
    const lowerArgCastType = arg.castType?.toLowerCase();
    return (
      lowerArgType === lowerArgCastType ||
      // for valid shorthand casts like 321.12::int or "false"::bool
      (['int', 'bool'].includes(lowerArgCastType) && argType.startsWith(lowerArgCastType))
    );
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
export function hasCCSSource(name: string) {
  return name.includes(':');
}

/**
 * This will return the name without any quotes.
 *
 * E.g. "`bytes`" will become "bytes"
 *
 * @param column
 * @returns
 */
export const getUnquotedColumnName = (column: ESQLColumn) => column.name;

/**
 * This returns the name with any quotes that were present.
 *
 * E.g. "`bytes`" will be "`bytes`"
 *
 * @param column
 * @returns
 */
export const getQuotedColumnName = (column: ESQLColumn) =>
  column.quoted ? column.text : column.name;

/**
 * TODO - consider calling lookupColumn under the hood of this function. Seems like they should really do the same thing.
 */
export function getColumnExists(
  column: ESQLColumn,
  { fields, variables }: Pick<ReferenceMaps, 'fields' | 'variables'>
) {
  const namesToCheck = [getUnquotedColumnName(column), getQuotedColumnName(column)];

  for (const name of namesToCheck) {
    if (fields.has(name) || variables.has(name)) {
      return true;
    }

    // TODO — I don't see this fuzzy searching in lookupColumn... should it be there?
    if (Boolean(fuzzySearch(name, fields.keys()) || fuzzySearch(name, variables.keys()))) {
      return true;
    }
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

export function getLastCharFromTrimmed(text: string) {
  return text[text.trimEnd().length - 1];
}

/**
 * Are we after a comma? i.e. STATS fieldA, <here>
 */
export function isRestartingExpression(text: string) {
  return getLastCharFromTrimmed(text) === ',' || characterPrecedesCurrentWord(text, ',');
}

export function findPreviousWord(text: string) {
  const words = text.split(/\s+/);
  return words[words.length - 2];
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

/**
 * Compares two strings in a case-insensitive manner
 */
export const noCaseCompare = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
