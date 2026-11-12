/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** The innermost command around the cursor, up to the cursor. */
export interface CommandSegment {
  /** Offset of the command's first token, or the cursor when no token was typed yet. */
  start: number;
  /** The cursor offset. */
  end: number;
  text: string;
}

/** A grammar rule (slot) the cursor can fill. */
export interface ExpectedRule {
  rule: string;
  /** The rules above the slot, outermost first. */
  stack: string[];
  /**
   * For each rule of `[...stack, rule]`, the ATN state of the rule above that called it, when
   * known. It tells apart calls of the same rule after the same token, as the columns after
   * FUSE's `SCORE BY` and `GROUP BY`.
   */
  invokingStates?: Array<number | undefined>;
  /**
   * How many of the innermost rules in `stack` start where the slot starts, e.g. 1 for a column
   * at `DISSECT ` (`primaryExpression`) but 0 for one inside `DISSECT TRIM(`.
   */
  startsRules: number;
  /**
   * The slot started before the cursor, so the cursor would extend it rather than start a new
   * one, e.g. a time unit after `NOW() - 1 `.
   */
  continuation: boolean;
  /** For a continuation, the slot's text typed before the cursor, e.g. `a.b`; otherwise empty. */
  text: string;
  /** Type of the last token before the slot, e.g. `AS` in `RENAME a AS b.c`. */
  previousTokenType?: number;
}

/** The grammar context of a token the cursor can take. */
export interface ExpectedToken {
  /** The rules above the token, outermost first. */
  rules: string[];
  /**
   * For each rule of `rules`, the ATN state of the rule above that called it, when known.
   */
  invokingStates: Array<number | undefined>;
  /** The token would be a command's first token, i.e. a command name. */
  startsCommand: boolean;
  /** The rule of the command the token would start, e.g. `whereCommand`. */
  command?: string;
}

export interface CursorLocation {
  segment: CommandSegment;
  /** The rules shared by every candidate, outermost first, e.g. `['processingCommand', 'keepCommand']`. */
  ruleStack: string[];
  /** Token types valid at the cursor, including `PIPE` and `EOF` or `RP` when the command can end. */
  expectedTokens: Set<number>;
  /**
   * For each expected token the grammar found, the rules above it, outermost first (e.g. `ASC`
   * → `['processingCommand', 'sortCommand', 'orderExpression']`), and whether the token would
   * start a command, like `WHERE` after a pipe but not `WHERE` in `STATS`. The tokens added
   * because the command can end have none.
   */
  tokenStacks: Map<number, ExpectedToken>;
  expectedRules: ExpectedRule[];
  /** The command is complete at the cursor, so a pipe may follow. */
  commandCanEnd: boolean;
  /** The word being typed, if any. */
  partial?: { text: string; start: number };
  /** Type of the last token before the cursor, or before the word being typed. */
  previousTokenType?: number;
  /** Whitespace or a comment separates the previous token from the cursor or the word typed. */
  whitespaceBefore: boolean;
  /** Characters the lexer dropped between the previous token and the cursor, e.g. a stray `:`. */
  skippedText: string;
  /** The cursor is inside a comment; no candidates are collected. */
  inComment: boolean;
}
