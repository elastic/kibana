/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function parse(expression: string): TinymathAST;
export function evaluate(
  expression: string | null,
  context: Record<string, any>
): number | number[];

// Named arguments are not top-level parts of the grammar, but can be nested
export type TinymathAST = number | TinymathVariable | TinymathFunction | TinymathNamedArgument;

// Zero-indexed location
export interface TinymathLocation {
  min: number;
  max: number;
}

export interface TinymathFunction {
  type: 'function';
  name: string;
  args: TinymathAST[];
  // Location is not guaranteed because PEG grammars are not left-recursive
  location?: TinymathLocation;
  // Text is not guaranteed because PEG grammars are not left-recursive
  text?: string;
}

export interface TinymathVariable {
  type: 'variable';
  value: string;
  text: string;
  location: TinymathLocation;
}

export interface TinymathNamedArgument {
  type: 'namedArgument';
  name: string;
  value: string;
  text: string;
  location: TinymathLocation;
}
