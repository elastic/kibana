/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CharStreams, CommonTokenStream, type CharStream, type Token } from 'antlr4';
import { default as PromQLLexer } from '../../antlr/promql_lexer';
import { default as PromQLParserGenerated } from '../../antlr/promql_parser';
import { PromQLErrorListener } from './promql_error_listener';
import { PromQLCstToAstConverter } from './cst_to_ast_converter';
import { PromQLBuilder } from '../builder';
import type { PromQLAstQueryExpression, PromQLAstExpression, PromQLParseResult } from '../types';
import type { EditorError } from '../../types';

export interface PromQLParseOptions {
  /**
   * Whether to collect and attach to AST nodes user's custom formatting:
   * comments and whitespace.
   */
  withFormatting?: boolean;

  /**
   * Character offset where the PromQL query begins. This is useful when
   * PromQL queries are embedded inside other queries (e.g., ES|QL).
   * The offset will be added to all location values in the AST.
   */
  offset?: number;
}

/**
 * Parser for PromQL queries.
 *
 * This parser transforms PromQL source text into an Abstract Syntax Tree (AST)
 * that can be used for analysis, validation, and transformation.
 */
export class PromQLParser {
  /**
   * Create a new PromQL parser instance.
   */
  public static readonly create = (src: string, options?: PromQLParseOptions) => {
    return new PromQLParser(src, options);
  };

  /**
   * Parse a complete PromQL query, generating an AST and a list of parsing errors.
   *
   * Make sure to check the returned `errors` list for any parsing issues.
   *
   * For example:
   *
   * ```typescript
   * const result = PromQLParser.parse('rate(http_requests_total[5m])');
   * ```
   *
   * @param src Source text to parse.
   * @param options Parsing options.
   */
  public static readonly parse = (src: string, options?: PromQLParseOptions): PromQLParseResult => {
    return PromQLParser.create(src, options).parse();
  };

  /**
   * Extract parsing errors from the source text without generating an AST.
   *
   * @param src Source text to parse for errors.
   * @returns A list of parsing errors.
   */
  public static readonly parseErrors = (src: string): EditorError[] => {
    return PromQLParser.create(src).parseErrors();
  };

  /**
   * Parse a PromQL query and throw if there are any errors.
   *
   * @param src Source text to parse.
   * @param options Parsing options.
   * @returns A result object containing the parsed query.
   * @throws The first parsing error if any errors occur.
   */
  public static readonly parseQuery = (
    src: string,
    options?: PromQLParseOptions
  ): PromQLParseResult<PromQLAstQueryExpression> => {
    const result = PromQLParser.parse(src, options);

    if (result.errors.length) {
      throw result.errors[0];
    }

    return result;
  };

  /**
   * Parse a single PromQL expression.
   *
   * For example:
   *
   * ```typescript
   * const result = PromQLParser.parseExpression('rate(http_requests_total[5m])');
   * ```
   *
   * @param src Source text of an expression to parse.
   * @param options Parsing options.
   * @returns A result object containing the parsed expression.
   */
  public static readonly parseExpression = (
    src: string,
    options?: PromQLParseOptions
  ): PromQLParseResult<PromQLAstExpression> => {
    const result = PromQLParser.parse(src, options);

    if (result.errors.length) {
      throw result.errors[0];
    }

    const expression = result.root.expression;

    if (!expression) {
      throw new Error('Invalid expression: no expression found in ' + src);
    }

    return {
      root: expression,
      errors: result.errors,
    };
  };

  /**
   * Get the first `count` tokens from the source text.
   *
   * @param src Text to parse for tokens.
   * @param count Number of tokens to parse.
   * @returns An array of parsed tokens.
   */
  public static readonly tokens = (src: string, count: number): Token[] => {
    const streams = CharStreams.fromString(src);
    const lexer = new PromQLLexer(streams);
    const tokens: Token[] = [];
    let i = 0;

    while (i < count) {
      const token = lexer.nextToken();

      if (token.type === PromQLLexer.EOF) {
        break;
      }

      tokens.push(token);
      i++;
    }

    return tokens;
  };

  public readonly streams: CharStream;
  public readonly lexer: PromQLLexer;
  public readonly tokens: CommonTokenStream;
  public readonly parser: PromQLParserGenerated;
  public readonly errors = new PromQLErrorListener();

  constructor(public readonly src: string, public readonly options: PromQLParseOptions = {}) {
    const streams = (this.streams = CharStreams.fromString(src));
    const lexer = (this.lexer = new PromQLLexer(streams));
    const tokens = (this.tokens = new CommonTokenStream(lexer));
    const parser = (this.parser = new PromQLParserGenerated(tokens));

    lexer.removeErrorListeners();
    lexer.addErrorListener(this.errors);

    parser.removeErrorListeners();
    parser.addErrorListener(this.errors);
  }

  /**
   * Parse the source text and return the AST.
   */
  public parse(): PromQLParseResult<PromQLAstQueryExpression> {
    try {
      const ctx = this.parser.singleStatement();
      const converter = new PromQLCstToAstConverter(this);
      const root = converter.fromSingleStatement(ctx);

      if (!root) {
        return {
          root: PromQLBuilder.expression.query(undefined, { incomplete: true }),
          errors: this.errors.getErrors(),
        };
      }

      return {
        root,
        errors: this.errors.getErrors(),
      };
    } catch (error) {
      const root = PromQLBuilder.expression.query(undefined, { incomplete: true });

      return {
        root,
        errors: this.errors.getErrors(),
      };
    }
  }

  /**
   * Parse the source text and return only the errors.
   */
  public parseErrors(): EditorError[] {
    this.parser.singleStatement();
    return this.errors.getErrors();
  }
}

/**
 * Parse a PromQL query string into an AST.
 *
 * @deprecated Use `PromQLParser.parse` instead.
 */
export const parse = (
  src: string | undefined,
  options: PromQLParseOptions = {}
): PromQLParseResult => {
  if (src == null || !src.trim()) {
    return {
      root: PromQLBuilder.expression.query(undefined),
      errors: [],
    };
  }

  return PromQLParser.create(src, options).parse();
};
