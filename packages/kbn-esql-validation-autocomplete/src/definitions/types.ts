/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ESQLCommand, ESQLCommandOption, ESQLFunction, ESQLMessage } from '@kbn/esql-ast';

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
      type: string;
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
    }>;
    minParams?: number;
    returnType: string;
    examples?: string[];
  }>;
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

export type FunctionArgSignature = FunctionDefinition['signatures'][number]['params'][number];
