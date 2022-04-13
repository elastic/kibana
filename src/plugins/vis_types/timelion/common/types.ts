/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

type TimelionFunctionArgsTypes = 'seriesList' | 'number' | 'string' | 'boolean' | 'null';

export interface TimelionFunctionArgsSuggestion {
  name: string;
  help: string;
}

export interface TimelionFunctionArgs {
  name: string;
  help?: string;
  insertText?: string;
  multi?: boolean;
  types: TimelionFunctionArgsTypes[];
  suggestions?: TimelionFunctionArgsSuggestion[];
  hidden?: boolean;
}

export interface ITimelionFunction {
  aliases: string[];
  args: TimelionFunctionArgs[];
  name: string;
  help: string;
  chainable: boolean;
  extended: boolean;
  isAlias: boolean;
  argsByName: {
    [key: string]: TimelionFunctionArgs[];
  };
}
