/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CharStreams, CommonTokenStream, type CharStream } from 'antlr4';
import { default as PromQLLexer } from '../../parser/antlr/promql_lexer';
import { default as PromQLParserGenerated } from '../../parser/antlr/promql_parser';
import { PromQLErrorListener } from './promql_error_listener';
import { PromQLCstToAstConverter } from './cst_to_ast_converter';
import { PromQLBuilder } from '../builder';
import type { PromQLAstQueryExpression, PromQLParseResult } from '../types';
import type { EditorError } from '../../types';

export interface PromQLParseOptions {
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
