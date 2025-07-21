/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLFunction, ESQLMessage, ESQLNumericLiteralType } from '../types';
import { Location } from '../commands_registry/types';

/**
 * All supported field types in ES|QL. This is all the types
 * that can come back in the table from a query.
 */
export const fieldTypes = [
  'boolean',
  'date',
  'double',
  'ip',
  'keyword',
  'integer',
  'long',
  'text',
  'unsigned_long',
  'version',
  'cartesian_point',
  'cartesian_shape',
  'geo_point',
  'geo_shape',
  'counter_integer',
  'counter_long',
  'counter_double',
  'unsupported',
  'date_nanos',
  'function_named_parameters',
] as const;

export type FieldType = (typeof fieldTypes)[number];
/**
 * All supported field types in ES|QL. This is all the types
 * that can come back in the table from a query.
 */
export const userDefinedTypes = [
  'boolean',
  'date',
  'double',
  'ip',
  'keyword',
  'integer',
  'long',
  'text',
  'unsigned_long',
  'version',
  'cartesian_point',
  'cartesian_shape',
  'geo_point',
  'geo_shape',
  'counter_integer',
  'counter_long',
  'counter_double',
  'unsupported',
  'date_nanos',
  'function_named_parameters',
  'null',
  'time_duration',
  'date_period',
  'param', // Defines a named param such as ?value or ??field
] as const;

/**
 * This is the list of all data types that are supported in ES|QL.
 *
 * Not all of these can be used as field types. Some can only be literals,
 * others may be the value of a field, but cannot be used in the index mapping.
 *
 * This is a partial list. The full list is here and we may need to expand this type as
 * the capabilities of the client-side engines grow.
 * https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/esql-core/src/main/java/org/elasticsearch/xpack/esql/core/type/DataType.java
 */
export const dataTypes = [
  ...fieldTypes,
  'null',
  'time_duration',
  'date_period',
  'param', // Defines a named param such as ?value or ??field
] as const;

export type SupportedDataType = (typeof dataTypes)[number];

/**
 * This is a set of array types. These aren't official ES|QL types, but they are
 * currently used in the function definitions in a couple of specific scenarios.
 *
 * The fate of these is uncertain. They may be removed in the future.
 */
const arrayTypes = [
  'double[]',
  'unsigned_long[]',
  'long[]',
  'integer[]',
  'counter_integer[]',
  'counter_long[]',
  'counter_double[]',
  'keyword[]',
  'text[]',
  'boolean[]',
  'any[]',
  'date[]',
  'date_period[]',
  'ip[]',
  'cartesian_point[]',
  'cartesian_shape[]',
  'geo_point[]',
  'geo_shape[]',
  'version[]',
  'date_nanos[]',
] as const;

export type ArrayType = (typeof arrayTypes)[number];

export enum FunctionDefinitionTypes {
  AGG = 'agg',
  SCALAR = 'scalar',
  OPERATOR = 'operator',
  GROUPING = 'grouping',
  TIME_SERIES_AGG = 'time_series_agg',
}

export type ReasonTypes = 'missingCommand' | 'unsupportedFunction' | 'unknownFunction';

/**
 * This is the type of a parameter in a function definition.
 */
export type FunctionParameterType = Exclude<SupportedDataType, 'unsupported'> | ArrayType | 'any';

export const isParameterType = (str: string | undefined): str is FunctionParameterType =>
  typeof str !== undefined &&
  str !== 'unsupported' &&
  ([...dataTypes, ...arrayTypes, 'any'] as string[]).includes(str as string);

export const isReturnType = (str: string | FunctionParameterType): str is FunctionReturnType =>
  str !== 'unsupported' &&
  (dataTypes.includes(str as SupportedDataType) || str === 'unknown' || str === 'any');

export interface FunctionParameter {
  name: string;
  type: FunctionParameterType;
  optional?: boolean;
  supportsWildcard?: boolean;

  /**
   * If set, this parameter does not accept a field. It only accepts a constant,
   * though a function can be used to create the value. (e.g. now() for dates or concat() for strings)
   */
  constantOnly?: boolean;

  /**
   * Default to false. If set to true, this parameter does not accept a function or literal, only fields.
   */
  fieldsOnly?: boolean;

  /**
   * if provided this means that the value must be one
   * of the options in the array iff the value is a literal.
   *
   * String values are case insensitive.
   *
   * If the value is not a literal, this field is ignored because
   * we can't check the return value of a function to see if it
   * matches one of the options prior to runtime.
   */
  acceptedValues?: string[];

  /**
   * Must only be included _in addition to_ acceptedValues.
   *
   * If provided this is the list of suggested values that
   * will show up in the autocomplete. If omitted, the acceptedValues
   * will be used as suggestions.
   *
   * This is useful for functions that accept
   * values that we don't want to show as suggestions.
   */
  literalSuggestions?: string[];
  mapParams?: string;
}

/**
 * This is the return type of a function definition.
 *
 * TODO: remove `any`
 */
export type FunctionReturnType = Exclude<SupportedDataType, 'unsupported'> | 'unknown' | 'any';

export interface Signature {
  params: FunctionParameter[];
  minParams?: number;
  returnType: FunctionReturnType;
  // Not used yet, but we will in the future.
  license?: string;
}

export interface FunctionDefinition {
  type: FunctionDefinitionTypes;
  preview?: boolean;
  ignoreAsSuggestion?: boolean;
  name: string;
  alias?: string[];
  description: string;
  locationsAvailable: Location[];
  signatures: Signature[];
  examples?: string[];
  validate?: (fnDef: ESQLFunction) => ESQLMessage[];
  operator?: string;
  customParametersSnippet?: string;
  // Not used yet, but we will in the future.
  license?: string;
}

export interface FunctionFilterPredicates {
  location: Location;
  returnTypes?: string[];
  ignored?: string[];
}

export interface Literals {
  name: string;
  description: string;
}

export interface ValidationErrors {
  wrongArgumentType: {
    message: string;
    type: {
      name: string;
      argType: string;
      value: string | number | Date;
      givenType: string;
    };
  };
  wrongArgumentNumber: {
    message: string;
    type: {
      fn: string;
      numArgs: number;
      passedArgs: number;
    };
  };
  wrongArgumentNumberTooMany: {
    message: string;
    type: {
      fn: string;
      numArgs: number;
      passedArgs: number;
      extraArgs: number;
    };
  };
  wrongArgumentNumberTooFew: {
    message: string;
    type: {
      fn: string;
      numArgs: number;
      passedArgs: number;
      missingArgs: number;
    };
  };
  unknownColumn: {
    message: string;
    type: { name: string | number };
  };
  unknownFunction: {
    message: string;
    type: { name: string };
  };
  unknownIndex: {
    message: string;
    type: { name: string };
  };
  noNestedArgumentSupport: {
    message: string;
    type: { name: string; argType: string };
  };
  unsupportedFunctionForCommand: {
    message: string;
    type: { name: string; command: string };
  };
  unsupportedFunctionForCommandOption: {
    message: string;
    type: { name: string; command: string; option: string };
  };
  unsupportedLiteralOption: {
    message: string;
    type: { name: string; value: string; supportedOptions: string };
  };
  shadowFieldType: {
    message: string;
    type: { field: string; fieldType: string; newType: string };
  };
  unsupportedColumnTypeForCommand: {
    message: string;
    type: { command: string; type: string; givenType: string; column: string };
  };
  unknownDissectKeyword: {
    message: string;
    type: { keyword: string };
  };
  wrongOptionArgumentType: {
    message: string;
    type: { command: string; option: string; type: string; givenValue: string };
  };
  unknownInterval: {
    message: string;
    type: { value: string };
  };
  unsupportedTypeForCommand: {
    message: string;
    type: { command: string; value: string; type: string };
  };
  unknownPolicy: {
    message: string;
    type: { name: string };
  };
  unknownAggregateFunction: {
    message: string;
    type: { type: string; value: string };
  };
  wildcardNotSupportedForCommand: {
    message: string;
    type: { command: string; value: string };
  };
  noWildcardSupportAsArg: {
    message: string;
    type: { name: string };
  };
  unsupportedFieldType: {
    message: string;
    type: { field: string };
  };
  unsupportedMode: {
    message: string;
    type: { command: string; value: string; expected: string };
  };
  fnUnsupportedAfterCommand: {
    message: string;
    type: { function: string; command: string };
  };
  expectedConstant: {
    message: string;
    type: { fn: string; given: string };
  };
  metadataBracketsDeprecation: {
    message: string;
    type: {};
  };
  unknownMetadataField: {
    message: string;
    type: { value: string; availableFields: string };
  };
  wrongDissectOptionArgumentType: {
    message: string;
    type: { value: string | number };
  };
  noAggFunction: {
    message: string;
    type: {
      commandName: string;
      expression: string;
    };
  };
  expressionNotAggClosed: {
    message: string;
    type: {
      commandName: string;
      expression: string;
    };
  };
  aggInAggFunction: {
    message: string;
    type: {
      nestedAgg: string;
    };
  };
  onlyWhereCommandSupported: {
    message: string;
    type: { fn: string };
  };
  invalidJoinIndex: {
    message: string;
    type: { identifier: string };
  };
  tooManyForks: {
    message: string;
    type: {};
  };
}

export type ErrorTypes = keyof ValidationErrors;
export type ErrorValues<K extends ErrorTypes> = ValidationErrors[K]['type'];

/**
 * Handles numeric types in ES|QL.
 */
export const ESQL_COMMON_NUMERIC_TYPES = ['double', 'long', 'integer'] as const;

export const ESQL_NUMERIC_DECIMAL_TYPES = [
  'double',
  'unsigned_long',
  'long',
  'counter_long',
  'counter_double',
] as const;

export const ESQL_NUMBER_TYPES = [
  'integer',
  'counter_integer',
  ...ESQL_NUMERIC_DECIMAL_TYPES,
] as const;

export function isNumericType(type: unknown): type is ESQLNumericLiteralType {
  return (
    typeof type === 'string' &&
    [...ESQL_NUMBER_TYPES, 'decimal'].includes(type as (typeof ESQL_NUMBER_TYPES)[number])
  );
}

export const ESQL_STRING_TYPES = ['keyword', 'text'] as const;
