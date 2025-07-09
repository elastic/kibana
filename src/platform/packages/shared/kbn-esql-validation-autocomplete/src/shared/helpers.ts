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
  type ESQLAstCommand,
  type ESQLAstItem,
  type ESQLColumn,
  type ESQLCommandOption,
  type ESQLFunction,
  type ESQLLiteral,
  type ESQLSingleAstItem,
  type ESQLSource,
  type ESQLTimeInterval,
  esqlCommandRegistry,
  timeUnits,
  type FieldType,
  type FunctionParameterType,
  type ArrayType,
  type FunctionDefinition,
  FunctionDefinitionTypes,
  type FunctionParameter,
  type FunctionReturnType,
} from '@kbn/esql-ast';
import type {
  ESQLFieldWithMetadata,
  ESQLUserDefinedColumn,
} from '@kbn/esql-ast/src/commands_registry/types';
import { getColumnForASTNode, getFunctionSignatures } from '@kbn/esql-ast/src/definitions/utils';
import { aggFunctionDefinitions } from '@kbn/esql-ast/src/definitions/generated/aggregation_functions';
import { timeSeriesAggFunctionDefinitions } from '@kbn/esql-ast/src/definitions/generated/time_series_agg_functions';
import { groupingFunctionDefinitions } from '@kbn/esql-ast/src/definitions/generated/grouping_functions';
import { scalarFunctionDefinitions } from '@kbn/esql-ast/src/definitions/generated/scalar_functions';
import { operatorsDefinitions } from '@kbn/esql-ast/src/definitions/all_operators';
import { getExpressionType } from '@kbn/esql-ast/src/definitions/utils';
import { getTestFunctions } from '@kbn/esql-ast/src/definitions/utils/test_functions';
import {
  ESQLIdentifier,
  ESQLInlineCast,
  ESQLLocation,
  ESQLParamLiteral,
  ESQLProperNode,
} from '@kbn/esql-ast/src/types';
import { uniqBy } from 'lodash';

import { enrichFieldsWithECSInfo } from '../autocomplete/utils/ecs_metadata_helper';
import { getLocationFromCommandOrOptionName } from './types';
import type { ReferenceMaps } from '../validation/types';
import type { ESQLCallbacks, ReasonTypes } from './types';
import { collectUserDefinedColumns } from './user_defined_columns';

export function nonNullable<T>(v: T): v is NonNullable<T> {
  return v != null;
}

export function isSingleItem(arg: ESQLAstItem): arg is ESQLSingleAstItem {
  return arg && !Array.isArray(arg);
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

export const within = (position: number, location: ESQLLocation | undefined) =>
  Boolean(location && location.min <= position && location.max >= position);

export function isSourceCommand({ label }: { label: string }) {
  return ['FROM', 'ROW', 'SHOW', 'TS'].includes(label);
}

let fnLookups: Map<string, FunctionDefinition> | undefined;

function buildFunctionLookup() {
  // we always refresh if we have test functions
  if (!fnLookups || getTestFunctions().length) {
    fnLookups = operatorsDefinitions
      .concat(
        scalarFunctionDefinitions,
        aggFunctionDefinitions,
        timeSeriesAggFunctionDefinitions,
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
    fn?.locationsAvailable.includes(getLocationFromCommandOrOptionName(option ?? parentCommand))
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

function doesLiteralMatchParameterType(argType: FunctionParameterType, item: ESQLLiteral) {
  if (item.literalType === argType) {
    return true;
  }

  if (bothStringTypes(argType, item.literalType)) {
    // all functions accept keyword literals for text parameters
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

export function isArrayType(type: string): type is ArrayType {
  return type.endsWith('[]');
}

/**
 * Given an array type for example `string[]` it will return `string`
 */
export function unwrapArrayOneLevel(type: FunctionParameterType): FunctionParameterType {
  return isArrayType(type) ? (type.slice(0, -2) as FunctionParameterType) : type;
}

export function createMapFromList<T extends { name: string }>(arr: T[]): Map<string, T> {
  const arrMap = new Map<string, T>();
  for (const item of arr) {
    arrMap.set(item.name, item);
  }
  return arrMap;
}

export function areFieldAndUserDefinedColumnTypesCompatible(
  fieldType: string | string[] | undefined,
  userColumnType: string | string[]
) {
  if (fieldType == null) {
    return false;
  }
  return fieldType === userColumnType;
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
        const hit = getColumnForASTNode(subArg, {
          fields: references.fields,
          userDefinedColumns: references.userDefinedColumns,
        });
        types.push(hit?.type || 'unsupported');
      }
      if (subArg.type === 'timeInterval') {
        types.push('time_duration');
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
 * Checks if both types are string types.
 *
 * Functions in ES|QL accept `text` and `keyword` types interchangeably.
 * @param type1
 * @param type2
 * @returns
 */
function bothStringTypes(type1: string, type2: string): boolean {
  return (type1 === 'text' || type1 === 'keyword') && (type2 === 'text' || type2 === 'keyword');
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
): boolean {
  const parameterType = parameterDefinition.type;
  if (parameterType === 'any') {
    return true;
  }
  if (isParam(arg)) {
    return true;
  }
  if (arg.type === 'literal') {
    const matched = doesLiteralMatchParameterType(parameterType, arg);
    return matched;
  }
  if (arg.type === 'function') {
    if (isSupportedFunction(arg.name, parentCommand).supported) {
      const fnDef = buildFunctionLookup().get(arg.name)!;
      return fnDef.signatures.some(
        (signature) =>
          signature.returnType === 'unknown' ||
          parameterType === signature.returnType ||
          bothStringTypes(parameterType, signature.returnType)
      );
    }
  }
  if (arg.type === 'timeInterval') {
    return parameterType === 'time_duration' && inKnownTimeInterval(arg.unit);
  }
  if (arg.type === 'column') {
    const hit = getColumnForASTNode(arg, {
      fields: references.fields,
      userDefinedColumns: references.userDefinedColumns,
    });
    const validHit = hit;
    if (!validHit) {
      return false;
    }
    const wrappedTypes: Array<(typeof validHit)['type']> = Array.isArray(validHit.type)
      ? validHit.type
      : [validHit.type];

    return wrappedTypes.some(
      (ct) =>
        ct === parameterType ||
        bothStringTypes(ct, parameterType) ||
        ct === 'null' ||
        ct === 'unknown'
    );
  }
  if (arg.type === 'inlineCast') {
    const lowerArgType = parameterType?.toLowerCase();
    const castedType = getExpressionType(arg);
    return castedType === lowerArgType;
  }
  return false;
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
  { fields, userDefinedColumns }: Pick<ReferenceMaps, 'fields' | 'userDefinedColumns'>
) {
  const columnName = node.type === 'identifier' ? node.name : node.parts.join('.');
  if (fields.has(columnName) || userDefinedColumns.has(columnName)) {
    return true;
  }

  // TODO — I don't see this fuzzy searching in lookupColumn... should it be there?
  if (
    Boolean(
      fuzzySearch(columnName, fields.keys()) || fuzzySearch(columnName, userDefinedColumns.keys())
    )
  ) {
    return true;
  }

  return false;
}

export const isAggFunction = (arg: ESQLFunction): boolean =>
  getFunctionDefinition(arg.name)?.type === FunctionDefinitionTypes.AGG;

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

// --- Fields helpers ---

export function transformMapToESQLFields(
  inputMap: Map<string, ESQLUserDefinedColumn[]>
): ESQLFieldWithMetadata[] {
  const esqlFields: ESQLFieldWithMetadata[] = [];

  for (const [, userDefinedColumns] of inputMap) {
    for (const userDefinedColumn of userDefinedColumns) {
      // Only include userDefinedColumns that have a known type
      if (userDefinedColumn.type) {
        esqlFields.push({
          name: userDefinedColumn.name,
          type: userDefinedColumn.type as FieldType,
        });
      }
    }
  }

  return esqlFields;
}

async function getEcsMetadata(resourceRetriever?: ESQLCallbacks) {
  if (!resourceRetriever?.getFieldsMetadata) {
    return undefined;
  }
  const client = await resourceRetriever?.getFieldsMetadata;
  if (client.find) {
    // Fetch full list of ECS field
    // This list should be cached already by fieldsMetadataClient
    const results = await client.find({ attributes: ['type'] });
    return results?.fields;
  }
}
// Get the fields from the FROM clause, enrich them with ECS metadata
export async function getFieldsFromES(query: string, resourceRetriever?: ESQLCallbacks) {
  const metadata = await getEcsMetadata();
  const fieldsOfType = await resourceRetriever?.getColumnsFor?.({ query });
  const fieldsWithMetadata = enrichFieldsWithECSInfo(fieldsOfType || [], metadata);
  return fieldsWithMetadata;
}

/**
 * @param query, the ES|QL query
 * @param commands, the AST commands
 * @param previousPipeFields, the fields from the previous pipe
 * @returns a list of fields that are available for the current pipe
 */
export async function getCurrentQueryAvailableFields(
  query: string,
  commands: ESQLAstCommand[],
  previousPipeFields: ESQLFieldWithMetadata[]
) {
  const cacheCopy = new Map<string, ESQLFieldWithMetadata>();
  previousPipeFields.forEach((field) => cacheCopy.set(field.name, field));
  const lastCommand = commands[commands.length - 1];
  const commandDefinition = esqlCommandRegistry.getCommandByName(lastCommand.name);

  // If the command has a columnsAfter function, use it to get the fields
  if (commandDefinition?.methods.columnsAfter) {
    const userDefinedColumns = collectUserDefinedColumns([lastCommand], cacheCopy, query);

    return commandDefinition.methods.columnsAfter(lastCommand, previousPipeFields, {
      userDefinedColumns,
    });
  } else {
    // If the command doesn't have a columnsAfter function, use the default behavior
    const userDefinedColumns = collectUserDefinedColumns(commands, cacheCopy, query);
    const arrayOfUserDefinedColumns: ESQLFieldWithMetadata[] = transformMapToESQLFields(
      userDefinedColumns ?? new Map<string, ESQLUserDefinedColumn[]>()
    );
    const allFields = uniqBy([...(previousPipeFields ?? []), ...arrayOfUserDefinedColumns], 'name');
    return allFields;
  }
}
