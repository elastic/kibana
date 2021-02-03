/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Position } from './core_editor';

export interface Token {
  /**
   * The value of the token.
   *
   * Can be an empty string.
   */
  value: string;

  /**
   * The type of the token. E.g., "whitespace". All of the types are
   * enumerated by the token lexer.
   */
  type: string;

  /**
   * The position of the first character of the token.
   */
  position: Position;
}
