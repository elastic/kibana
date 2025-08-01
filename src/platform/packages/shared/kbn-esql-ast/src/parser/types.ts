/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as esql_parser from '../antlr/esql_parser';
import type { CstToAstConverter } from './cst_to_ast_converter';
import type { ESQLAstComment } from '../types';

/**
 * Lines of decorations per *whitespace line*. A *whitespace line* is a line
 * which tracks line breaks only from the HIDDEN channel. It does not take into
 * account line breaks from the DEFAULT channel, i.e. content lines. For example,
 * it will ignore line breaks from triple-quoted strings, but will track line
 * breaks from comments and whitespace.
 *
 * Each list entry represents a line of decorations.
 */
export type ParsedFormattingDecorationLines = ParsedFormattingDecoration[][];

/**
 * A source text decoration that we are interested in.
 *
 * - Comments: we preserve user comments when pretty-printing.
 * - Line breaks: we allow users to specify one custom line break.
 */
export type ParsedFormattingDecoration =
  | ParsedFormattingCommentDecoration
  | ParsedFormattingLineBreakDecoration;

/**
 * A comment AST node with additional information about its position in the
 * source text.
 */
export interface ParsedFormattingCommentDecoration {
  type: 'comment';

  /**
   * Whether the comment has content on the same line to the left of it.
   */
  hasContentToLeft: boolean;

  /**
   * Whether the comment has content on the same line to the right of it.
   */
  hasContentToRight: boolean;

  /**
   * The comment AST node.
   */
  node: ESQLAstComment;
}

export interface ParsedFormattingLineBreakDecoration {
  type: 'line-break';

  /**
   * The number of line breaks in the source text.
   */
  lines: number;
}

type Functions<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
};
type GrammarRule = keyof Functions<InstanceType<typeof esql_parser.default>>;
type CstToAstConversion = keyof Functions<CstToAstConverter>;

/**
 * Specifies a grammar *parsing target* for the ESQL parser. The parsing target
 * is a grammar rule which is used to parse the source text. Picking a
 * specific rule allows to parse any ES|QL grammar construct, such as a
 * command, expression, or a query (instead of parsing the whole query).
 */
export type EsqlParsingTarget = [
  /**
   * ANTLR grammar rule, used to parse the source text.
   */
  rule: GrammarRule,

  /**
   * The conversion to use for converting the root ANTLR CST node to a Kibana AST node.
   */
  conversion: CstToAstConversion
];
