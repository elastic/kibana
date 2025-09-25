/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { LicenseType } from '@kbn/licensing-types';
import type { PricingProduct } from '@kbn/core-pricing-common/src/types';
import type { ESQLNumericLiteralType } from '../types';
import type { Location } from '../commands_registry/types';

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
  'param', // Defines a named param such as ?value or ??field,
  'geohash',
  'geohex',
  'geotile',
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

export const grokSupportedDataTypes = ['int', 'long', 'double', 'float', 'boolean'] as const;
export type GrokDataType = (typeof grokSupportedDataTypes)[number];

export type ReasonTypes = 'missingCommand' | 'unsupportedFunction' | 'unknownFunction';

/**
 * This is the type of a parameter in a function definition.
 */
export type FunctionParameterType = Exclude<SupportedDataType, 'unsupported'> | ArrayType | 'any';

export const isFieldType = (str: string | undefined): str is FieldType =>
  typeof str !== undefined && ([...fieldTypes] as string[]).includes(str as string);

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
   * A list of suggested values for this parameter.
   */
  suggestedValues?: string[];

  mapParams?: string;
}

export interface ElasticsearchCommandDefinition {
  type: string;
  name: string;
  license?: LicenseType;
  observability_tier?: string;
}

export interface ElasticsearchSettingsDefinition {
  name: string;
  type: string;
  serverlessOnly: boolean;
  preview: boolean;
  snapshotOnly: boolean;
  description: string;
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
  license?: LicenseType;
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
  operator?: string;
  customParametersSnippet?: string;
  license?: LicenseType;
  observabilityTier?: Uppercase<Extract<PricingProduct, { type: 'observability' }>['tier']>;
}

export interface FunctionFilterPredicates {
  location: Location;
  returnTypes?: string[];
  ignored?: string[];
  allowed?: string[];
}

export interface Literals {
  name: string;
  description: string;
}

export interface ValidationErrors {
  wrongNumberArgsExact: {
    message: string;
    type: {
      fn: string;
      expected: number;
      actual: number;
    };
  };
  wrongNumberArgsVariadic: {
    message: string;
    type: {
      fn: string;
      validArgCounts: number[];
      actual: number;
    };
  };
  wrongNumberArgsAtLeast: {
    message: string;
    type: {
      fn: string;
      minArgs: number;
      actual: number;
    };
  };
  noMatchingCallSignature: {
    message: string;
    type: {
      functionName: string;
      argTypes: string;
      validSignatures: string[];
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
  functionNotAllowedHere: {
    message: string;
    type: { name: string; locationName: string };
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
  unknownPolicy: {
    message: string;
    type: { name: string };
  };
  nestedAggFunction: {
    message: string;
    type: { parentName: string; name: string };
  };
  unknownAggregateFunction: {
    message: string;
    type: { type: string; value: string };
  };
  unsupportedFieldType: {
    message: string;
    type: { field: string };
  };
  unsupportedMode: {
    message: string;
    type: { command: string; value: string; expected: string };
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
  invalidJoinIndex: {
    message: string;
    type: { identifier: string };
  };
  tooManyForks: {
    message: string;
    type: {};
  };
  licenseRequired: {
    message: string;
    type: {
      name: string;
      requiredLicense: string;
    };
  };
  licenseRequiredForSignature: {
    message: string;
    type: {
      name: string;
      signatureDescription: string;
      requiredLicense: string;
    };
  };
  changePointWrongFieldType: {
    message: string;
    type: {
      columnName: string;
      givenType: string;
    };
  };
  dropTimestampWarning: {
    message: string;
    type: {};
  };
  inferenceIdRequired: {
    message: string;
    type: {};
  };
  unsupportedQueryType: {
    message: string;
    type: {};
  };
  forkTooManyBranches: {
    message: string;
    type: {};
  };
  forkTooFewBranches: {
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
