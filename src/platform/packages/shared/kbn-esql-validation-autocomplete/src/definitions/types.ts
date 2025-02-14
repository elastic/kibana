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
  ESQLCommand,
  ESQLCommandOption,
  ESQLFunction,
  ESQLMessage,
  ESQLSource,
} from '@kbn/esql-ast';
import { GetColumnsByTypeFn, SuggestionRawDefinition } from '../autocomplete/types';
import type {
  ESQLCallbacks,
  ESQLControlVariable,
  ESQLVariableType,
  ESQLSourceResult,
} from '../shared/types';

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
  'ip[]',
  'cartesian_point[]',
  'cartesian_shape[]',
  'geo_point[]',
  'geo_shape[]',
  'version[]',
  'date_nanos[]',
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

export interface Signature {
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
    mapParams?: string;
  }>;
  minParams?: number;
  returnType: FunctionReturnType;
}

export interface FunctionDefinition {
  type: 'builtin' | 'agg' | 'scalar' | 'operator' | 'grouping';
  preview?: boolean;
  ignoreAsSuggestion?: boolean;
  name: string;
  alias?: string[];
  description: string;
  supportedCommands: string[];
  supportedOptions?: string[];
  signatures: Signature[];
  examples?: string[];
  validate?: (fnDef: ESQLFunction) => ESQLMessage[];
  operator?: string;
}

export interface CommandSuggestParams<CommandName extends string> {
  /**
   * The text of the query to the left of the cursor.
   */
  innerText: string;
  /**
   * The AST node of this command.
   */
  command: ESQLCommand<CommandName>;
  /**
   * Get a list of columns by type. This includes fields from any sources as well as
   * variables defined in the query.
   */
  getColumnsByType: GetColumnsByTypeFn;
  /**
   * Check for the existence of a column by name.
   * @param column
   * @returns
   */
  columnExists: (column: string) => boolean;
  /**
   * Gets the name that should be used for the next variable.
   * @returns
   */
  getSuggestedVariableName: () => string;
  /**
   * Examine the AST to determine the type of an expression.
   * @param expression
   * @returns
   */
  getExpressionType: (expression: ESQLAstItem | undefined) => SupportedDataType | 'unknown';
  /**
   * Get a list of system preferences (currently the target value for the histogram bar)
   * @returns
   */
  getPreferences?: () => Promise<{ histogramBarTarget: number } | undefined>;
  /**
   * The definition for the current command.
   */
  definition: CommandDefinition<CommandName>;
  /**
   * Fetch a list of all available sources
   * @returns
   */
  getSources: () => Promise<ESQLSourceResult[]>;
  /**
   * Inspect the AST and returns the sources that are used in the query.
   * @param type
   * @returns
   */
  getSourcesFromQuery: (type: 'index' | 'policy') => ESQLSource[];
  /**
   * Generate a list of recommended queries
   * @returns
   */
  getRecommendedQueriesSuggestions: (prefix?: string) => Promise<SuggestionRawDefinition[]>;
  /**
   * The AST for the query behind the cursor.
   */
  previousCommands?: ESQLCommand[];
  callbacks?: ESQLCallbacks;
  getVariablesByType?: (type: ESQLVariableType) => ESQLControlVariable[] | undefined;
  supportsControls?: boolean;
}

export type CommandSuggestFunction<CommandName extends string> = (
  params: CommandSuggestParams<CommandName>
) => Promise<SuggestionRawDefinition[]>;

export interface CommandBaseDefinition<CommandName extends string> {
  name: CommandName;

  /**
   * Command name prefix, such as "LEFT" or "RIGHT" for JOIN command.
   */
  types?: CommandTypeDefinition[];

  alias?: string;
  description: string;
  /**
   * Displays a Technical preview label in the autocomplete
   */
  preview?: boolean;
  /**
   * Whether to show or hide in autocomplete suggestion list
   */
  hidden?: boolean;
  suggest?: CommandSuggestFunction<CommandName>;
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

export interface CommandTypeDefinition {
  name: string;
  description?: string;
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
