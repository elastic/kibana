/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Token } from 'antlr4';
import { ParseOptions, parse } from '../parser';
import type { ESQLAstQueryExpression, EditorError } from '../types';
import {
  WrappingPrettyPrinter,
  WrappingPrettyPrinterOptions,
} from '../pretty_print/wrapping_pretty_printer';

/**
 * Represents a parsed or programmatically created ES|QL query. Keeps track of
 * the AST, source code, and optionally lexer tokens.
 */
export class EsqlQuery {
  public static readonly fromSrc = (src: string, opts?: ParseOptions): EsqlQuery => {
    const { root, tokens, errors } = parse(src, opts);

    return new EsqlQuery(root, src, tokens, errors);
  };

  constructor(
    /**
     * The parsed or programmatically created ES|QL AST. The AST is the only
     * required property for the query and is the source of truth for the query.
     */
    public readonly ast: ESQLAstQueryExpression,

    /**
     * Optional source code that was used to generate the AST. Provide this
     * if the query was created from a parsed source code. Otherwise, set to
     * an empty string.
     */
    public readonly src: string = '',

    /**
     * Optional array of ANTLR tokens, in case the query was parsed from a
     * source code.
     */
    public readonly tokens: Token[] = [],

    /**
     * Parsing errors.
     */
    public readonly errors: EditorError[] = []
  ) {}

  public print(opts?: WrappingPrettyPrinterOptions): string {
    const printer = new WrappingPrettyPrinter(opts);
    return printer.print(this.ast);
  }
}
