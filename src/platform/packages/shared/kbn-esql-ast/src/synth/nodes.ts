/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '../builder';
import type {
  ESQLColumn,
  ESQLDecimalLiteral,
  ESQLIntegerLiteral,
  ESQLParamLiteral,
  ESQLSource,
  ESQLStringLiteral,
} from '../types';
import { SynthLiteralFragment } from './synth_literal_fragment';
import { SynthNode } from './synth_node';

/**
 * Creates an ES|QL source node.
 *
 * @param index Elasticsearch index name to create a source node for.
 * @returns ES|QL source node.
 */
export const src = (index: string, prefix?: string, selector?: string): ESQLSource => {
  const node = Builder.expression.source.index(index, prefix, selector);

  return SynthNode.from(node);
};

/**
 * Crates an ES|QL integer literal node.
 *
 * @param value The integer value to create a literal for.
 * @returns ES|QL integer literal node.
 */
export const int = (value: number): ESQLIntegerLiteral => {
  const node = Builder.expression.literal.integer(value);

  return SynthNode.from(node);
};

/**
 * Creates an ES|QL decimal (float, double) literal node.
 *
 * @param value The decimal value to create a literal for.
 * @returns ES|QL decimal literal node.
 */
export const float = (value: number): ESQLDecimalLiteral => {
  const node = Builder.expression.literal.decimal(value);

  return SynthNode.from(node);
};

/**
 * Creates an ES|QL numeric literal node. If the value is an integer, an integer
 * literal node is created, otherwise a decimal literal node is created.
 *
 * @param value The numeric value to create a literal for.
 * @returns ES|QL numeric literal node.
 */
export const num = (value: number): ESQLDecimalLiteral | ESQLIntegerLiteral => {
  if (Number.isInteger(value)) {
    return int(value);
  } else {
    return float(value);
  }
};

/**
 * Creates an ES|QL boolean literal node.
 *
 * @param value The boolean value to create a literal for.
 * @returns ES|QL boolean literal node.
 */
export const bool = (value: boolean) => {
  const node = Builder.expression.literal.boolean(value);

  return SynthNode.from(node);
};

/**
 * Creates an ES|QL string literal node.
 *
 * @param value The string value to create a literal for.
 * @returns ES|QL string literal node.
 */
export const str = (value: string): ESQLStringLiteral => {
  const node = Builder.expression.literal.string(value);

  return SynthNode.from(node);
};

/**
 * Creates an ES|QL named parameter node.
 *
 * @param name The name of the parameter.
 * @returns ES|QL named parameter node.
 */
export const par = (name: string): ESQLParamLiteral => {
  const node = Builder.param.build(name);

  return SynthNode.from(node);
};

/**
 * Creates an ES|QL named double parameter node.
 *
 * @param name The name of the parameter.
 * @returns ES|QL named parameter node.
 */
export const dpar = (name: string): ESQLParamLiteral => {
  const node = Builder.param.named({ value: name, paramKind: '??' });

  return SynthNode.from(node);
};

/**
 * Creates an ES|QL column node.
 *
 * @param name The name of the column.
 * @returns ES|QL column node.
 */
export const col = (name: string | string[]): ESQLColumn => {
  const node = Builder.expression.column(name);

  return SynthNode.from(node);
};

/**
 * Creates a literal fragment representing a keyword.
 *
 * @param keyword The keyword to create a literal fragment for.
 * @returns A SynthLiteralFragment representing the keyword.
 */
export const kwd = (keyword: string): SynthLiteralFragment => {
  return new SynthLiteralFragment(keyword);
};
