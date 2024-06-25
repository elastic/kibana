/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type ESQLAst = ESQLAstCommand[];

export type ESQLAstCommand = ESQLCommand | ESQLAstMetricsCommand;

export type ESQLAstNode = ESQLAstCommand | ESQLAstItem;

export type ESQLSingleAstItem =
  | ESQLFunction
  | ESQLCommandOption
  | ESQLSource
  | ESQLColumn
  | ESQLTimeInterval
  | ESQLList
  | ESQLLiteral
  | ESQLCommandMode
  | ESQLInlineCast
  | ESQLUnknownItem;

export type ESQLAstField = ESQLFunction | ESQLColumn;

export type ESQLAstItem = ESQLSingleAstItem | ESQLAstItem[];

export interface ESQLLocation {
  min: number;
  max: number;
}

export interface ESQLAstBaseItem<Name = string> {
  name: Name;
  text: string;
  location: ESQLLocation;
  incomplete: boolean;
}

export interface ESQLCommand<Name = string> extends ESQLAstBaseItem<Name> {
  type: 'command';
  args: ESQLAstItem[];
}

export interface ESQLAstMetricsCommand extends ESQLCommand<'metrics'> {
  sources: ESQLSource[];
  aggregates?: ESQLAstField[];
  grouping?: ESQLAstField[];
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

export interface ESQLInlineCast<ValueType = ESQLAstItem> extends ESQLAstBaseItem {
  type: 'inlineCast';
  value: ValueType;
  castType: string;
}

/**
 * This node represents something the AST generator
 * didn't recognize in the ANTLR parse tree.
 *
 * It can show up if the AST generator code is out of sync
 * with the ANTLR grammar or if there is some idiosyncrasy
 * or bug in the parse tree.
 *
 * These nodes can be ignored for the purpose of validation
 * and autocomplete, but they may be helpful in detecting bugs.
 */
export interface ESQLUnknownItem extends ESQLAstBaseItem {
  type: 'unknown';
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

export type ESQLLiteral =
  | ESQLNumberLiteral
  | ESQLBooleanLiteral
  | ESQLNullLiteral
  | ESQLStringLiteral
  | ESQLParamLiteral<string>;

// @internal
export interface ESQLNumberLiteral extends ESQLAstBaseItem {
  type: 'literal';
  literalType: 'number';
  value: number;
}

// @internal
export interface ESQLBooleanLiteral extends ESQLAstBaseItem {
  type: 'literal';
  literalType: 'boolean';
  value: string;
}

// @internal
export interface ESQLNullLiteral extends ESQLAstBaseItem {
  type: 'literal';
  literalType: 'null';
  value: string;
}

// @internal
export interface ESQLStringLiteral extends ESQLAstBaseItem {
  type: 'literal';
  literalType: 'string';
  value: string;
}

// @internal
export interface ESQLParamLiteral<ParamType extends string = string> extends ESQLAstBaseItem {
  type: 'literal';
  literalType: 'param';
  paramType: ParamType;
  value?: string | number;
}

/**
 * *Unnamed* parameter is not named, just a question mark "?".
 *
 * @internal
 */
export type ESQLUnnamedParamLiteral = ESQLParamLiteral<'unnamed'>;

/**
 * *Named* parameter is a question mark followed by a name "?name".
 *
 * @internal
 */
export interface ESQLNamedParamLiteral extends ESQLParamLiteral<'named'> {
  value: string;
}

/**
 * *Positional* parameter is a question mark followed by a number "?1".
 *
 * @internal
 */
export interface ESQLPositionalParamLiteral extends ESQLParamLiteral<'positional'> {
  value: number;
}

export interface ESQLMessage {
  type: 'error' | 'warning';
  text: string;
  location: ESQLLocation;
  code: string;
}

export type AstProviderFn = (text: string | undefined) =>
  | Promise<{
      ast: ESQLAst;
      errors: EditorError[];
    }>
  | { ast: ESQLAst; errors: EditorError[] };

export interface EditorError {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
  message: string;
  code?: string;
  severity: 'error' | 'warning' | number;
}
