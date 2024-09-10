/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Token } from 'antlr4';
import { ParseOptions, parse } from '../parser';
import type { ESQLAstQueryExpression } from '../types';
import {
  WrappingPrettyPrinter,
  WrappingPrettyPrinterOptions,
} from '../pretty_print/wrapping_pretty_printer';

export class EsqlQuery {
  public static readonly fromSrc = (src: string, opts?: ParseOptions): EsqlQuery => {
    const { root, tokens } = parse(src, opts);
    return new EsqlQuery(root, src, tokens);
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
    public readonly tokens: Token[] = []
  ) {}

  public print(opts?: WrappingPrettyPrinterOptions): string {
    const printer = new WrappingPrettyPrinter(opts);
    return printer.print(this.ast);
  }
}
