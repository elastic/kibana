/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ESQLCommand, ESQLCommandOption, ESQLFunction, ESQLMessage } from '@kbn/esql-ast';

export type FunctionParameterType =
  | 'number'
  | 'date'
  | 'string'
  | 'boolean'
  | 'null'
  | 'any'
  | 'ip'
  | 'chrono_literal'
  | 'time_literal'
  | 'cartesian_point'
  | 'geo_point'
  | 'number[]'
  | 'string[]'
  | 'boolean[]'
  | 'date[]';

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
      literalOnly?: boolean;
    }>;
    minParams?: number;
    returnType: string;
    examples?: string[];
  }>;
  validate?: (fnDef: ESQLFunction) => ESQLMessage[];
}

type CommandParameterType =
  | 'any'
  | 'source'
  | 'function'
  | 'column'
  | 'number'
  | 'string'
  | 'boolean';

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
      type: CommandParameterType;
      optional?: boolean;
      innerType?: string;
      values?: string[];
      valueDescriptions?: string[];
      literalOnly?: boolean;
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

// TODO - think about separate types for functions and commands
export type SignatureType =
  | FunctionDefinition['signatures'][number]
  | CommandOptionsDefinition['signature'];
export type SignatureArgType = SignatureType['params'][number];
