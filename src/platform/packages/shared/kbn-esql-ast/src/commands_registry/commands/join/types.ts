/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLAstExpression } from '../../../types';

/**
 * Position of the caret in the JOIN command, which can be easily matched with
 * with basic parsing. Can be matched with a regular expression. Does not
 * include the `condition` and `after_condition` positions.
 *
 * ```
 * <type> JOIN <index> [ AS <alias> ] ON <conditions>
 * |     ||   ||      |  | ||      |  | |
 * |     ||   ||      |  | ||      |  | |
 * |     ||   ||      |  | ||      |  | after_on
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
  | 'on'
  | 'after_on';

/**
 * Position of the caret in the JOIN command. Includes the `condition` and
 * `after_condition` positions, which need to involve the main parser to be
 * determined correctly.
 *
 * ```
 * <type> JOIN <index> [ AS <alias> ] ON <condition> [, <condition> [, ...]]
 * |     ||   ||      |  | ||      |  | ||          |   |          |
 * |     ||   ||      |  | ||      |  | ||          |   |          |
 * |     ||   ||      |  | ||      |  | ||          |   |          after_condition
 * |     ||   ||      |  | ||      |  | ||          |   condition
 * |     ||   ||      |  | ||      |  | ||          after_condition
 * |     ||   ||      |  | ||      |  | |condition
 * |     ||   ||      |  | ||      |  | after_on
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
export type JoinPosition = JoinStaticPosition | 'condition' | 'after_condition';

/**
 * Details about the position of the caret in the JOIN command.
 */
export interface JoinCommandPosition {
  pos: JoinPosition;

  /** The `<type>` of the JOIN command. */
  type: string;

  /**
   * If position is `condition` or `after_condition`, this property holds the
   * condition expression AST node after which or inside of which the caret is
   * located.
   */
  condition?: ESQLAstExpression;
}
