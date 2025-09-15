/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  ESQLAstItem,
  ESQLCommand,
  ESQLFunction,
  ESQLMessage,
  ESQLSource,
  ESQLAstCommand,
  ESQLAst,
} from '@kbn/esql-ast';
import { ESQLControlVariable } from '@kbn/esql-types';
import { GetColumnsByTypeFn, SuggestionRawDefinition } from '../autocomplete/types';
import type {
  ESQLPolicy,
  ReferenceMaps,
  ESQLFieldWithMetadata,
  ESQLUserDefinedColumn,
} from '../validation/types';
import { ESQLCallbacks, ESQLSourceResult } from '../shared/types';

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
  'time_duration',
  'date_period',
  'param', // Defines a named param such as ?value or ??field
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
  params: FunctionParameter[];
  minParams?: number;
  returnType: FunctionReturnType;
  // Not used yet, but we will in the future.
  license?: string;
}

export enum FunctionDefinitionTypes {
  AGG = 'agg',
  SCALAR = 'scalar',
  OPERATOR = 'operator',
  GROUPING = 'grouping',
}

/**
 * This is a list of locations within an ES|QL query.
 *
 * It is currently used to suggest appropriate functions and
 * operators given the location of the cursor.
 */
export enum Location {
  /**
   * In the top-level EVAL command
   */
  EVAL = 'eval',

  /**
   * In the top-level WHERE command
   */
  WHERE = 'where',

  /**
   * In the top-level ROW command
   */
  ROW = 'row',

  /**
   * In the top-level SORT command
   */
  SORT = 'sort',

  /**
   * In the top-level STATS command
   */
  STATS = 'stats',

  /**
   * In a grouping clause
   */
  STATS_BY = 'stats_by',

  /**
   * In a per-agg filter
   */
  STATS_WHERE = 'stats_where',

  /**
   * Top-level ENRICH command
   */
  ENRICH = 'enrich',

  /**
   * ENRICH...WITH clause
   */
  ENRICH_WITH = 'enrich_with',

  /**
   * In the top-level DISSECT command (used only for
   * assignment in APPEND_SEPARATOR)
   */
  DISSECT = 'dissect',

  /**
   * In RENAME (used only for AS)
   */
  RENAME = 'rename',

  /**
   * In the JOIN command (used only for AS)
   */
  JOIN = 'join',

  /**
   * In the SHOW command
   */
  SHOW = 'show',

  /**
   * In the COMPLETION command
   */
  COMPLETION = 'completion',
}

const commandOptionNameToLocation: Record<string, Location> = {
  eval: Location.EVAL,
  where: Location.WHERE,
  row: Location.ROW,
  sort: Location.SORT,
  stats: Location.STATS,
  by: Location.STATS_BY,
  enrich: Location.ENRICH,
  with: Location.ENRICH_WITH,
  dissect: Location.DISSECT,
  rename: Location.RENAME,
  join: Location.JOIN,
  show: Location.SHOW,
  completion: Location.COMPLETION,
};

/**
 * Pause before using this in new places. Where possible, use the Location enum directly.
 *
 * This is primarily around for backwards compatibility with the old system of command and option names.
 */
export const getLocationFromCommandOrOptionName = (name: string) =>
  commandOptionNameToLocation[name];

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
}

export type GetPolicyMetadataFn = (name: string) => Promise<ESQLPolicy | undefined>;

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
   * Get suggestions for columns by type. This includes fields from any sources as well as
   * user-defined columns in the query.
   */
  getColumnsByType: GetColumnsByTypeFn;
  /**
   * Gets the names of all columns
   */
  getAllColumnNames: () => string[];
  /**
   * Check for the existence of a column by name.
   * @param column
   * @returns
   */
  columnExists: (column: string) => boolean;
  /**
   * Gets the name that should be used for the next userDefinedColumn.
   *
   * @param extraFieldNames — names that should be recognized as columns
   * but that won't be found in the current table from Elasticsearch. This is currently only
   * used to recognize enrichment fields from a policy in the ENRICH command.
   * @returns
   */
  getSuggestedUserDefinedColumnName: (extraFieldNames?: string[]) => string;
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
   * Fetch suggestions for all available policies
   */
  getPolicies: () => Promise<SuggestionRawDefinition[]>;
  /**
   * Get metadata for a policy by name
   */
  getPolicyMetadata: GetPolicyMetadataFn;
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
  getRecommendedQueriesSuggestions: (
    queryString: string,
    prefix?: string
  ) => Promise<SuggestionRawDefinition[]>;
  /**
   * The AST for the query behind the cursor.
   */
  previousCommands?: ESQLCommand[];
  callbacks?: ESQLCallbacks;
  getVariables?: () => ESQLControlVariable[] | undefined;
  supportsControls?: boolean;
  references?: {
    fields: Map<string, ESQLFieldWithMetadata>;
    userDefinedColumns: Map<string, ESQLUserDefinedColumn[]>;
  };
}

export type CommandSuggestFunction<CommandName extends string> = (
  params: CommandSuggestParams<CommandName>
) => Promise<SuggestionRawDefinition[]> | SuggestionRawDefinition[];

export interface CommandDefinition<CommandName extends string> {
  name: CommandName;

  /**
   * A description of what the command does. Displayed in the autocomplete.
   */
  description: string;

  /**
   * The pattern for declaring this command statement. Displayed in the autocomplete.
   */
  declaration: string;

  /**
   * A list of examples of how to use the command. Displayed in the autocomplete.
   */
  examples: string[];

  /**
   * Command name prefix, such as "LEFT" or "RIGHT" for JOIN command.
   */
  types?: CommandTypeDefinition[];

  /**
   * Displays a Technical preview label in the autocomplete
   */
  preview?: boolean;

  /**
   * Whether to show or hide in autocomplete suggestion list. We generally use
   * this for commands that are not yet ready to be advertised.
   */
  hidden?: boolean;

  /**
   * This method is run when the command is being validated, but it does not
   * prevent the default behavior. If you need a full override, we are currently
   * doing those directly in the validateCommand function in the validation module.
   */
  validate?: (
    command: ESQLCommand<CommandName>,
    references: ReferenceMaps,
    ast: ESQLAst
  ) => ESQLMessage[];

  /**
   * This method is called to load suggestions when the cursor is within this command.
   */
  suggest: CommandSuggestFunction<CommandName>;

  /**
   * This method is called to define the fields available after this command is applied.
   */
  fieldsSuggestionsAfter?: (
    lastCommand: ESQLAstCommand,
    previousCommandFields: ESQLFieldWithMetadata[],
    userDefinedColumns: ESQLFieldWithMetadata[]
  ) => ESQLFieldWithMetadata[];
}

export interface CommandTypeDefinition {
  name: string;
  description?: string;
}

export interface Literals {
  name: string;
  description: string;
}

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
