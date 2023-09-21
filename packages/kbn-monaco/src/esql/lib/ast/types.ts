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
  | ESQLLiteral;

export type ESQLAstItem = ESQLSingleAstItem | ESQLAstItem[];

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

export interface ESQLCommandOption {
  type: 'option';
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
  args: ESQLAstItem[];
}

export interface ESQLTimeInterval {
  type: 'timeInterval';
  unit: string;
  quantity: number;
  text: string;
  location?: ESQLLocation;
}

export interface ESQLSource {
  type: 'source';
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

export interface ESQLList {
  type: 'list';
  values: ESQLLiteral[];
  text: string;
  location?: ESQLLocation;
}

export interface ESQLLiteral {
  type: 'literal';
  literalType: 'string' | 'number' | 'boolean' | 'null';
  name?: string;
  value: string | number;
  text: string;
  location?: ESQLLocation;
}

export interface ESQLMessage {
  type: 'error' | 'warning';
  text: string;
  location?: ESQLLocation;
}
