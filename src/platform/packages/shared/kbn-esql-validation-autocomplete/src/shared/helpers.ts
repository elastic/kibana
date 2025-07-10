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
  type ESQLFunction,
  type ESQLLiteral,
  esqlCommandRegistry,
  timeUnits,
  type FieldType,
  type FunctionParameterType,
  type ArrayType,
  type FunctionDefinition,
  FunctionDefinitionTypes,
  type FunctionParameter,
} from '@kbn/esql-ast';
import type {
  ESQLFieldWithMetadata,
  ESQLUserDefinedColumn,
} from '@kbn/esql-ast/src/commands_registry/types';
import { getFunctionDefinition } from '@kbn/esql-ast/src/definitions/utils';
import { aggFunctionDefinitions } from '@kbn/esql-ast/src/definitions/generated/aggregation_functions';
import { timeSeriesAggFunctionDefinitions } from '@kbn/esql-ast/src/definitions/generated/time_series_agg_functions';
import { groupingFunctionDefinitions } from '@kbn/esql-ast/src/definitions/generated/grouping_functions';
import { scalarFunctionDefinitions } from '@kbn/esql-ast/src/definitions/generated/scalar_functions';
import { operatorsDefinitions } from '@kbn/esql-ast/src/definitions/all_operators';
import { getTestFunctions } from '@kbn/esql-ast/src/definitions/utils/test_functions';
import { ESQLLocation, ESQLParamLiteral, ESQLProperNode } from '@kbn/esql-ast/src/types';
import { uniqBy } from 'lodash';

import { enrichFieldsWithECSInfo } from '../autocomplete/utils/ecs_metadata_helper';
import { getLocationFromCommandOrOptionName } from './types';
import type { ESQLCallbacks, ReasonTypes } from './types';
import { collectUserDefinedColumns } from './user_defined_columns';

export function nonNullable<T>(v: T): v is NonNullable<T> {
  return v != null;
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

const unwrapStringLiteralQuotes = (value: string) => value.slice(1, -1);

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

export function hasWildcard(name: string) {
  return /\*/.test(name);
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
