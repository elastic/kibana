/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstExpression } from '../../../types';

/**
 * Position of the caret in the JOIN command, which can be easily matched with
 * with basic parsing. Can be matched with a regular expression. Does not
 * include the `expression` position.
 *
 * ```
 * <type> JOIN <index> [ AS <alias> ] ON <expressions>
 * |     ||   ||      |  | ||      |  |
 * |     ||   ||      |  | ||      |  |
 * |     ||   ||      |  | ||      |  on
 * |     ||   ||      |  | ||      after_alias
 * |     ||   ||      |  | |alias
 * |     ||   ||      |  | after_as
 * |     ||   ||      |  as
 * |     ||   ||      after_index
 * |     ||   |index
 * |     ||   after_mnemonic
 * |     |mnemonic
 * |     after_type
 * type
 * ```
 */
export type JoinStaticPosition =
  | 'none'
  | 'type'
  | 'after_type'
  | 'mnemonic'
  | 'after_mnemonic'
  | 'index'
  | 'after_index'
  | 'as'
  | 'after_as'
  | 'alias'
  | 'after_alias'
  | 'on';

/**
 * Position of the caret in the JOIN command. Includes the `on_expression` position,
 * which needs to involve the main parser to be determined correctly.
 *
 * ```
 * <type> JOIN <index> [ AS <alias> ] ON <expression> [, <expression> [, ...]]
 * |     ||   ||      |  | ||      |  | ||           |   |           |
 * |     ||   ||      |  | ||      |  | ||           |   |           |
 * |     ||   ||      |  | ||      |  | ||           |   on_expression
 * |     ||   ||      |  | ||      |  | |on_expression
 * |     ||   ||      |  | ||      |  on
 * |     ||   ||      |  | ||      after_alias
 * |     ||   ||      |  | |alias
 * |     ||   ||      |  | after_as
 * |     ||   ||      |  as
 * |     ||   ||      after_index
 * |     ||   |index
 * |     ||   after_mnemonic
 * |     |mnemonic
 * |     after_type
 * type
 * ```
 */
export type JoinPosition = JoinStaticPosition | 'on_expression';

/**
 * Details about the position of the caret in the JOIN command.
 */
export interface JoinCommandPosition {
  pos: JoinPosition;

  /**
   * If position is `expression`, this property holds the
   * expression AST node inside of which the caret is located.
   */
  expression?: ESQLAstExpression;

  /**
   * Whether the expression is complete (not incomplete).
   * Used to determine if we should suggest comma/pipe.
   */
  isExpressionComplete?: boolean;
}
