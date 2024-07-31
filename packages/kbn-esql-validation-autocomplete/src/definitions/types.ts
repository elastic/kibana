/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ESQLCommand, ESQLCommandOption, ESQLFunction, ESQLMessage } from '@kbn/esql-ast';

export const supportedFieldTypes = [
  'number',
  'date',
  'string',
  'boolean',
  'ip',
  'cartesian_point',
  'cartesian_shape',
  'geo_point',
  'geo_shape',
  'version',
] as const;

export const isSupportedFieldType = (type: string): type is SupportedFieldType =>
  supportedFieldTypes.includes(type as SupportedFieldType);

export type SupportedFieldType = (typeof supportedFieldTypes)[number];

export type FunctionParameterType =
  | SupportedFieldType
  | 'null'
  | 'any'
  | 'chrono_literal'
  | 'time_literal'
  | 'number[]'
  | 'string[]'
  | 'boolean[]'
  | 'any[]'
  | 'date[]';

export type FunctionReturnType =
  | 'number'
  | 'date'
  | 'any'
  | 'boolean'
  | 'string'
  | 'cartesian_point'
  | 'cartesian_shape'
  | 'geo_point'
  | 'geo_shape'
  | 'ip'
  | 'version'
  | 'void';

export interface FunctionDefinition {
  type: 'builtin' | 'agg' | 'eval';
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
      noNestingFunctions?: boolean;
      supportsWildcard?: boolean;
      /**
       * If set, this parameter does not accept a field. It only accepts a constant,
       * though a function can be used to create the value. (e.g. now() for dates or concat() for strings)
       */
      constantOnly?: boolean;
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
      literalOptions?: string[];
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

export interface CommandBaseDefinition {
  name: string;
  alias?: string;
  description: string;
  signature: {
    multipleParams: boolean;
    // innerType here is useful to drill down the type in case of "column"
    // i.e. column of type string
    params: Array<{
      name: string;
      type: string;
      optional?: boolean;
      innerType?: string;
      values?: string[];
      valueDescriptions?: string[];
      constantOnly?: boolean;
      wildcards?: boolean;
    }>;
  };
}

export interface CommandOptionsDefinition extends CommandBaseDefinition {
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

export interface CommandDefinition extends CommandBaseDefinition {
  options: CommandOptionsDefinition[];
  examples: string[];
  validate?: (option: ESQLCommand) => ESQLMessage[];
  modes: CommandModeDefinition[];
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
