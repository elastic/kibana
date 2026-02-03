/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '../../ast/builder';
import type {
  ESQLColumn,
  ESQLDecimalLiteral,
  ESQLFunction,
  ESQLIntegerLiteral,
  ESQLList,
  ESQLParamLiteral,
  ESQLSource,
  ESQLStringLiteral,
} from '../../types';
import { isQualifiedColumnShorthand } from './holes';
import { SynthLiteralFragment } from './synth_literal_fragment';
import { SynthNode } from './synth_node';
import type { SynthColumnShorthand, SynthQualifiedColumnShorthand } from './types';

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
 * Creates an ES|QL source node with an alias (e.g., `index AS alias`).
 *
 * @param index Elasticsearch index name to create a source node for.
 * @param alias The alias name for the source.
 * @returns ES|QL binary expression node representing `source AS alias`.
 */
export const srcAs = (index: string, alias: string): ESQLFunction<'binary-expression', 'as'> => {
  const source = src(index);
  const aliasNode = Builder.identifier({ name: alias });
  const node = Builder.expression.func.binary('as', [source, aliasNode]);

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
export const col = (
  name: string | SynthColumnShorthand | SynthQualifiedColumnShorthand
): ESQLColumn => {
  let columnName: string | SynthColumnShorthand;
  let qualifierName: string | undefined;

  // Identify qualified columns names tuples ['qualifier', ['fieldName']]
  if (isQualifiedColumnShorthand(name)) {
    qualifierName = name[0];
    columnName = name[1];
  } else {
    // Simple or nested column
    columnName = name as string | SynthColumnShorthand;
  }

  const node = Builder.expression.column(columnName, qualifierName);

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

/**
 * Supported primitive types for ES|QL list literals.
 */
export type ListPrimitive = string | number | boolean;

/**
 * Creates an ES|QL list literal AST node from an array of primitive values.
 *
 * The array elements must all be of the same primitive type: string, number,
 * or boolean. ES|QL list literals use square brackets and are rendered as:
 *
 * - `[1, 2, 3]` for integer lists
 * - `["a", "b"]` for string lists
 * - `[TRUE, FALSE]` for boolean lists
 *
 * @param values An array of primitive values (strings, numbers, or booleans).
 *     All elements must be of the same type.
 * @returns ES|QL list literal node.
 * @throws Error if the array is empty or contains unsupported types.
 */
export const list = (values: ListPrimitive[]): ESQLList => {
  if (values.length === 0) {
    throw new Error('Cannot create an empty list literal');
  }

  // Currently in ES|QL language all list elements must be of the same type,
  // we verify that here.
  const firstType = typeof values[0];

  for (let i = 1; i < values.length; i++) {
    if (typeof values[i] !== firstType) {
      throw new Error(
        `All list elements must be of the same type. Expected "${firstType}", but found "${typeof values[
          i
        ]}" at index ${i}`
      );
    }
  }

  const astValues = values.map((value) => {
    switch (typeof value) {
      case 'string':
        return str(value);
      case 'number':
        return num(value);
      case 'boolean':
        return bool(value);
      default:
        throw new Error(`Unsupported list element type: ${typeof value}`);
    }
  });

  const node = Builder.expression.list.literal({ values: astValues });

  return SynthNode.from(node);
};
