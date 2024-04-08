/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { statsAggregationFunctionDefinitions } from '../definitions/aggs';
import { builtinFunctions } from '../definitions/builtin';
import { commandDefinitions } from '../definitions/commands';
import { evalFunctionsDefinitions } from '../definitions/functions';
import { getFunctionSignatures } from '../definitions/helpers';
import { chronoLiterals, timeLiterals } from '../definitions/literals';
import {
  byOption,
  metadataOption,
  asOption,
  onOption,
  withOption,
  appendSeparatorOption,
} from '../definitions/options';
import type {
  CommandDefinition,
  CommandOptionsDefinition,
  FunctionDefinition,
  SignatureArgType,
} from '../definitions/types';
import type { ESQLRealField, ESQLVariable, ReferenceMaps } from '../validation/types';
import { removeMarkerArgFromArgsList } from './context';
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
  return ['from', 'row', 'show'].includes(String(label));
}

let fnLookups: Map<string, FunctionDefinition> | undefined;
let commandLookups: Map<string, CommandDefinition> | undefined;

function buildFunctionLookup() {
  if (!fnLookups) {
    fnLookups = builtinFunctions
      .concat(evalFunctionsDefinitions, statsAggregationFunctionDefinitions)
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

export const unwrapStringLiteralQuotes = (value: string) => value.slice(1, -1);

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

function compareLiteralType(argTypes: string, item: ESQLLiteral) {
  if (item.literalType !== 'string') {
    return argTypes === item.literalType;
  }
  if (argTypes === 'chrono_literal') {
    return chronoLiterals.some(({ name }) => name === item.text);
  }
  return argTypes === item.literalType;
}

export function getColumnHit(
  columnName: string,
  { fields, variables }: Pick<ReferenceMaps, 'fields' | 'variables'>,
  position?: number
): ESQLRealField | ESQLVariable | undefined {
  return fields.get(columnName) || variables.get(columnName)?.[0];
}

const ARRAY_REGEXP = /\[\]$/;

export function isArrayType(type: string) {
  return ARRAY_REGEXP.test(type);
}

export function extractSingleType(type: string) {
  return type.replace(ARRAY_REGEXP, '');
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
                ? { name: `InnerArgument[]`, type: '' }
                : { name: innerArg.text, type: innerArg.type }
            ),
            returnType: '',
          },
        ],
      },
      { withTypes: false }
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
        const hit = getColumnHit(subArg.name, references);
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
  return timeLiterals.some(({ name }) => name === item.unit.toLowerCase());
}

export function isEqualType(
  item: ESQLSingleAstItem,
  argDef: SignatureArgType,
  references: ReferenceMaps,
  parentCommand?: string,
  nameHit?: string
) {
  const argType = 'innerType' in argDef && argDef.innerType ? argDef.innerType : argDef.type;
  if (argType === 'any') {
    return true;
  }
  if (item.type === 'literal') {
    return compareLiteralType(argType, item);
  }
  if (item.type === 'function') {
    if (isSupportedFunction(item.name, parentCommand).supported) {
      const fnDef = buildFunctionLookup().get(item.name)!;
      return fnDef.signatures.some((signature) => argType === signature.returnType);
    }
  }
  if (item.type === 'timeInterval') {
    return argType === 'time_literal' && inKnownTimeInterval(item);
  }
  if (item.type === 'column') {
    if (argType === 'column') {
      // anything goes, so avoid any effort here
      return true;
    }
    const hit = getColumnHit(nameHit ?? item.name, references);
    const validHit = hit;
    if (!validHit) {
      return false;
    }
    const wrappedTypes = Array.isArray(validHit.type) ? validHit.type : [validHit.type];
    return wrappedTypes.some((ct) => argType === ct);
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

export function columnExists(
  column: ESQLColumn,
  { fields, variables }: Pick<ReferenceMaps, 'fields' | 'variables'>
) {
  if (fields.has(column.name) || variables.has(column.name)) {
    return { hit: true, nameHit: column.name };
  }
  if (column.quoted) {
    const originalName = column.text;
    if (variables.has(originalName)) {
      return { hit: true, nameHit: originalName };
    }
  }
  if (
    Boolean(fuzzySearch(column.name, fields.keys()) || fuzzySearch(column.name, variables.keys()))
  ) {
    return { hit: true, nameHit: column.name };
  }
  return { hit: false };
}

export function sourceExists(index: string, sources: Set<string>) {
  if (sources.has(index)) {
    return true;
  }
  return Boolean(fuzzySearch(index, sources.keys()));
}

export function getLastCharFromTrimmed(text: string) {
  return text[text.trimEnd().length - 1];
}

export function isRestartingExpression(text: string) {
  return getLastCharFromTrimmed(text) === ',';
}

export function shouldBeQuotedText(
  text: string,
  { dashSupported }: { dashSupported?: boolean } = {}
) {
  return dashSupported ? /[^a-zA-Z\d_\.@-]/.test(text) : /[^a-zA-Z\d_\.@]/.test(text);
}
