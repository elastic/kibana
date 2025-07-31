/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '../builder';
import {
  ESQLDecimalLiteral,
  ESQLIntegerLiteral,
  ESQLParamLiteral,
  ESQLStringLiteral,
} from '../types';

/**
 * Crates an ES|QL integer literal node.
 *
 * @param value The integer value to create a literal for.
 * @returns ES|QL integer literal node.
 */
export const int = (value: number): ESQLIntegerLiteral => {
  const node = Builder.expression.literal.integer(value);

  return node;
};

/**
 * Creates an ES|QL decimal (float, double) literal node.
 *
 * @param value The decimal value to create a literal for.
 * @returns ES|QL decimal literal node.
 */
export const float = (value: number): ESQLDecimalLiteral => {
  const node = Builder.expression.literal.decimal(value);

  return node;
};

/**
 * Creates an ES|QL string literal node.
 *
 * @param value The string value to create a literal for.
 * @returns ES|QL string literal node.
 */
export const str = (value: string): ESQLStringLiteral => {
  const node = Builder.expression.literal.string(value);

  return node;
};

/**
 * Creates an ES|QL named parameter node.
 *
 * @param name The name of the parameter.
 * @returns ES|QL named parameter node.
 */
export const par = (name: string): ESQLParamLiteral => {
  const node = Builder.param.build(name);

  return node;
};
