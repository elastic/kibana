/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type ESQLAst = ESQLCommand[];

export type ESQLSingleAstItem =
  | ESQLFunction
  | ESQLCommandOption
  | ESQLSource
  | ESQLColumn
  | ESQLTimeInterval
  | ESQLList
  | ESQLLiteral
  | ESQLCommandMode;

export type ESQLAstItem = ESQLSingleAstItem | ESQLAstItem[];

export interface ESQLLocation {
  min: number;
  max: number;
}

interface ESQLAstBaseItem {
  name: string;
  text: string;
  location: ESQLLocation;
  incomplete: boolean;
}

export interface ESQLCommand extends ESQLAstBaseItem {
  type: 'command';
  args: ESQLAstItem[];
}

export interface ESQLCommandOption extends ESQLAstBaseItem {
  type: 'option';
  args: ESQLAstItem[];
}

export interface ESQLCommandMode extends ESQLAstBaseItem {
  type: 'mode';
}

export interface ESQLFunction extends ESQLAstBaseItem {
  type: 'function';
  args: ESQLAstItem[];
}

export interface ESQLTimeInterval extends ESQLAstBaseItem {
  type: 'timeInterval';
  unit: string;
  quantity: number;
}

export interface ESQLSource extends ESQLAstBaseItem {
  type: 'source';
  sourceType: 'index' | 'policy';
}

export interface ESQLColumn extends ESQLAstBaseItem {
  type: 'column';
  quoted: boolean;
}

export interface ESQLList extends ESQLAstBaseItem {
  type: 'list';
  values: ESQLLiteral[];
}

export interface ESQLLiteral extends ESQLAstBaseItem {
  type: 'literal';
  literalType: 'string' | 'number' | 'boolean' | 'null';
  value: string | number;
}

export interface ESQLMessage {
  type: 'error' | 'warning';
  text: string;
  location: ESQLLocation;
  code: string;
}

export type AstProviderFn = (text: string | undefined) => Promise<{
  ast: ESQLAst;
  errors: EditorError[];
}>;

export interface EditorError {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
  message: string;
  code?: string;
  severity: 'error' | 'warning' | number;
}
