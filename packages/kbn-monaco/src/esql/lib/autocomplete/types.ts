/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../../../..';

/** @public **/
export interface ESQLCustomAutocompleteCallbacks {
  getSourceIdentifiers?: CallbackFn;
  getFieldsIdentifiers?: CallbackFn;
  getPoliciesIdentifiers?: CallbackFn<{ name: string; indices: string[] }>;
  getPolicyFieldsIdentifiers?: CallbackFn;
  getPolicyMatchingFieldIdentifiers?: CallbackFn;
}

/** @internal **/
type CallbackFn<T = string> = (ctx: {
  word: string;
  userDefinedVariables: UserDefinedVariables;
}) => T[] | Promise<T[]>;

/** @internal **/
export interface UserDefinedVariables {
  sourceIdentifiers: string[];
  policyIdentifiers: string[];
}

/** @internal **/
export type AutocompleteCommandDefinition = Pick<
  monaco.languages.CompletionItem,
  'label' | 'insertText' | 'kind' | 'detail' | 'documentation' | 'sortText'
>;

export type ESQLAst = ESQLCommand[];

export type ESQLAstItem = number | string | ESQLFunction | ESQLSource | ESQLColumn | ESQLVariable;

export interface ESQLLocation {
  min: number;
  max: number | undefined;
}

export interface ESQLCommand {
  type: 'command';
  name: string;
  text: string;
  location?: ESQLLocation;
  args: ESQLAstItem[];
}

export interface ESQLFunction {
  type: 'function';
  name: string;
  text: string;
  location?: ESQLLocation;
}

export interface ESQLSource {
  type: 'source';
  name: string;
  text: string;
  location?: ESQLLocation;
}

export interface ESQLVariable {
  type: 'variable';
  name: string;
  text: string;
  location?: ESQLLocation;
}

export interface ESQLColumn {
  type: 'column';
  name: string;
  text: string;
  location?: ESQLLocation;
}

export interface ESQLTimeInterval {
  type: 'timeInterval';
  name: string;
  text: string;
  location?: ESQLLocation;
}

export interface ESQLErrors {
  type: 'error';
  text: string;
  location?: ESQLLocation;
}
