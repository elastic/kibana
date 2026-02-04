/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Token } from 'antlr4';
import type { ParseResult } from '../parser';
import type { ESQLProperNode } from '../types';

export interface VerbatimPrettyPrinterOptions {
  /**
   * Optional source text. When provided alongside an AST node with a `location`,
   * this printer returns the exact substring for that node.
   */
  src?: string;
}

function isParseResult(value: unknown): value is Pick<ParseResult, 'tokens'> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tokens' in value &&
    Array.isArray((value as any).tokens)
  );
}

/**
 * A formatting-preserving "printer" that does **not** pretty print.
 *
 * - For a full `ParseResult`, it reproduces the original source exactly by
 *   concatenating lexer token text (including whitespace and comments).
 * - For an AST node, it can return an exact substring when `opts.src` is
 *   provided and the node has a `location`.
 */
export class VerbatimPrettyPrinter {
  /**
   * @returns A string produced by concatenating token text (skips EOF).
   */
  public static readonly printTokens = (tokens: Token[]): string => {
    let out = '';
    for (const token of tokens) {
      // ANTLR EOF token type is typically -1. It may not always have text.
      if ((token as any).type === -1) continue;
      const anyToken = token as any;
      let text: unknown = anyToken.text;

      // Some ANTLR token implementations keep `text` unset; fall back to the
      // underlying input stream when possible.
      if (text == null) {
        const inputStream = anyToken.source?.[1];
        if (inputStream && typeof inputStream.getText === 'function') {
          try {
            text = inputStream.getText(anyToken.start, anyToken.stop);
          } catch {
            try {
              text = inputStream.getText({ start: anyToken.start, stop: anyToken.stop });
            } catch {
              // ignore
            }
          }
        }
      }

      // Do not drop empty-string text; it is still part of the original source.
      if (text != null) out += String(text);
    }
    return out;
  };

  /**
   * Prints a full parse result, preserving all whitespace and comments.
   */
  public static readonly parseResult = (result: Pick<ParseResult, 'tokens'>): string => {
    return VerbatimPrettyPrinter.printTokens(result.tokens);
  };

  public static readonly print = (
    input: Pick<ParseResult, 'tokens'> | Token[] | string | ESQLProperNode,
    opts: VerbatimPrettyPrinterOptions = {}
  ): string => {
    if (typeof input === 'string') return input;
    if (Array.isArray(input)) return VerbatimPrettyPrinter.printTokens(input);
    if (isParseResult(input)) return VerbatimPrettyPrinter.parseResult(input);

    const node = input as ESQLProperNode;
    const { src } = opts;
    const loc = node.location;
    if (src && loc) {
      return src.slice(loc.min, loc.max + 1);
    }

    throw new Error(
      'VerbatimPrettyPrinter.print(node) requires opts.src and node.location to preserve formatting.'
    );
  };
}

