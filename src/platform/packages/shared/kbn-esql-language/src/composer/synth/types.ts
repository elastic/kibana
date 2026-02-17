/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ParseOptions } from '../../parser';
import type { ESQLAstExpression, ESQLProperNode } from '../../types';
import type { SynthLiteralFragment } from './synth_literal_fragment';
import type { SynthNode } from './synth_node';

export type SynthGenerator<N extends ESQLProperNode> = (src: string, opts?: ParseOptions) => N;

export type SynthTemplateHole =
  /**
   * A hole is normally an AST node.
   */
  | ESQLAstExpression

  /**
   * If a list of AST nodes is provided, it will be joined with a comma.
   */
  | ESQLAstExpression[]

  /**
   * A shorthand for a column name, which is an array of column parts.
   */
  | SynthColumnShorthand

  /**
   * A shorthand for a qualified column name, which is a tuple where
   * the first element is the qualifier (e.g., index name) and the second
   * element is the column name represented as a `SynthColumnShorthand`.
   */
  | SynthQualifiedColumnShorthand

  /**
   * If a number is provided, it will be converted to the right AST node type:
   *
   * - integer for integers
   * - decimal for floats
   */
  | number

  /**
   * A string will be converted to a string literal AST node.
   */
  | string

  /**
   * A boolean will be converted to a boolean literal (TRUE/FALSE) AST node.
   */
  | boolean

  /**
   * A literal fragment can be used to insert raw strings into the query.
   * Use it for inserting keywords or other query elements that are "smaller"
   * than a full AST node.
   */
  | SynthLiteralFragment;

/**
 * A developer-friendly way to specify nested column names in ESQL queries.
 * Each part in the array represents a segment of the column name.
 *
 * For example, `['user', 'name']` represents the column `user.name`.
 */
export type SynthColumnShorthand = string[];

/**
 * A developer-friendly way to specify qualified column names in ESQL queries.
 * The first element in the tuple is the qualifier (e.g., index name), and the
 * second element is the column name represented as a `SynthColumnShorthand`.
 *
 * For example, `['index', ['user', 'name']]` represents the column
 * `[index].[user.name]`.
 */
export type SynthQualifiedColumnShorthand = [string, SynthColumnShorthand];

export type SynthTaggedTemplate<N extends ESQLProperNode> = (
  template: TemplateStringsArray,
  ...params: SynthTemplateHole[]
) => N & SynthNode;

export type SynthTaggedTemplateWithOpts<N extends ESQLProperNode> = (
  opts?: ParseOptions
) => SynthTaggedTemplate<N>;

export type SynthMethod<N extends ESQLProperNode> = SynthGenerator<N> &
  SynthTaggedTemplate<N> &
  SynthTaggedTemplateWithOpts<N>;
