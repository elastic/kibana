/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ESQLAst,
  ESQLAstItem,
  ESQLCommand,
  ESQLCommandOption,
  ESQLFunction,
  ESQLMessage,
} from '@kbn/esql-ast';
import { GetColumnsByTypeFn, SuggestionRawDefinition } from '../autocomplete/types';

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
] as const;

export type FieldType = (typeof fieldTypes)[number];

export const isFieldType = (type: string | FunctionParameterType): type is FieldType =>
  fieldTypes.includes(type as FieldType);

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
  'time_literal', // @TODO consider merging time_literal with time_duration
  'time_duration',
  'date_period',
] as const;

export type SupportedDataType = (typeof dataTypes)[number];

export const isSupportedDataType = (
  type: string | FunctionParameterType
): type is SupportedDataType => dataTypes.includes(type as SupportedDataType);

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
] as const;

export type ArrayType = (typeof arrayTypes)[number];

/**
 * This is the type of a parameter in a function definition.
 */
export type FunctionParameterType = Exclude<SupportedDataType, 'unsupported'> | ArrayType | 'any';

export const isParameterType = (str: string | undefined): str is FunctionParameterType =>
  typeof str !== undefined &&
  str !== 'unsupported' &&
  ([...dataTypes, ...arrayTypes, 'any'] as string[]).includes(str as string);

/**
 * This is the return type of a function definition.
 *
 * TODO: remove `any`
 */
export type FunctionReturnType = Exclude<SupportedDataType, 'unsupported'> | 'unknown' | 'any';

export const isReturnType = (str: string | FunctionParameterType): str is FunctionReturnType =>
  str !== 'unsupported' &&
  (dataTypes.includes(str as SupportedDataType) || str === 'unknown' || str === 'any');

export interface FunctionDefinition {
  type: 'builtin' | 'agg' | 'eval';
  preview?: boolean;
  ignoreAsSuggestion?: boolean;
  name: string;
  alias?: string[];
  description: string;
  supportedCommands: string[];
  supportedOptions?: string[];
  signatures: Array<{
    params: Array<{
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
       * Must only be included _in addition to_ literalOptions.
       *
       * If provided this is the list of suggested values that
       * will show up in the autocomplete. If omitted, the literalOptions
       * will be used as suggestions.
       *
       * This is useful for functions that accept
       * values that we don't want to show as suggestions.
       */
      literalSuggestions?: string[];
    }>;
    minParams?: number;
    returnType: FunctionReturnType;
  }>;
  examples?: string[];
  validate?: (fnDef: ESQLFunction) => ESQLMessage[];
}

export interface CommandBaseDefinition<CommandName extends string> {
  name: CommandName;
  alias?: string;
  description: string;
  /**
   * Whether to show or hide in autocomplete suggestion list
   */
  hidden?: boolean;
  suggest?: (
    innerText: string,
    command: ESQLCommand<CommandName>,
    getColumnsByType: GetColumnsByTypeFn,
    columnExists: (column: string) => boolean,
    getSuggestedVariableName: () => string,
    getExpressionType: (expression: ESQLAstItem | undefined) => SupportedDataType | 'unknown',
    getPreferences?: () => Promise<{ histogramBarTarget: number } | undefined>,
    fullTextAst?: ESQLAst
  ) => Promise<SuggestionRawDefinition[]>;
  /** @deprecated this property will disappear in the future */
  signature: {
    multipleParams: boolean;
    // innerTypes here is useful to drill down the type in case of "column"
    // i.e. column of type string
    params: Array<{
      name: string;
      type: string;
      optional?: boolean;
      innerTypes?: Array<SupportedDataType | 'any' | 'policy'>;
      values?: string[];
      valueDescriptions?: string[];
      constantOnly?: boolean;
      wildcards?: boolean;
    }>;
  };
}

export interface CommandOptionsDefinition<CommandName extends string = string>
  extends CommandBaseDefinition<CommandName> {
  wrapped?: string[];
  optional: boolean;
  skipCommonValidation?: boolean;
  validate?: (
    option: ESQLCommandOption,
    command: ESQLCommand,
    references?: unknown
  ) => ESQLMessage[];
}

export interface CommandModeDefinition {
  name: string;
  description: string;
  values: Array<{ name: string; description: string }>;
  prefix?: string;
}

export interface CommandDefinition<CommandName extends string>
  extends CommandBaseDefinition<CommandName> {
  examples: string[];
  validate?: (option: ESQLCommand) => ESQLMessage[];
  hasRecommendedQueries?: boolean;
  /** @deprecated this property will disappear in the future */
  modes: CommandModeDefinition[];
  /** @deprecated this property will disappear in the future */
  options: CommandOptionsDefinition[];
}

export interface Literals {
  name: string;
  description: string;
}

export type SignatureType =
  | FunctionDefinition['signatures'][number]
  | CommandOptionsDefinition['signature'];
export type SignatureArgType = SignatureType['params'][number];

export type FunctionParameter = FunctionDefinition['signatures'][number]['params'][number];
