/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ESQLCommand, ESQLCommandOption, ESQLMessage, ESQLSingleAstItem } from '../types';

export interface FunctionDefinition {
  builtin?: boolean;
  ignoreAsSuggestion?: boolean;
  name: string;
  alias?: string[];
  description: string;
  supportedCommands: string[];
  signatures: Array<{
    params: Array<{
      name: string;
      type: string;
      optional?: boolean;
      noNestingFunctions?: boolean;
      supportsWildcard?: boolean;
    }>;
    infiniteParams?: boolean;
    minParams?: number;
    returnType: string;
    examples?: string[];
  }>;
  warning?: (...args: ESQLSingleAstItem[]) => string | undefined;
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
      literalOnly?: boolean;
      wildcards?: boolean;
    }>;
  };
}

export interface CommandOptionsDefinition extends CommandBaseDefinition {
  wrapped?: string[];
  optional: boolean;
  skipCommonValidation?: boolean;
  validate?: (option: ESQLCommandOption) => ESQLMessage[];
}

export interface CommandModeDefinition extends CommandBaseDefinition {
  name: string;
  description: string;
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
