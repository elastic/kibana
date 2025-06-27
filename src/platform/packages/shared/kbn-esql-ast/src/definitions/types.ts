/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLFunction, ESQLMessage } from '../types';
import { Location } from '../commands_registry/types';

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

export type SupportedDataType = (typeof userDefinedTypes)[number];

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
}

/**
 * This is the type of a parameter in a function definition.
 */
export type FunctionParameterType = Exclude<SupportedDataType, 'unsupported'> | ArrayType | 'any';

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
