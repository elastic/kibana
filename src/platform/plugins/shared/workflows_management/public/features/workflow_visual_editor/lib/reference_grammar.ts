/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** `text` is `{{ … }}` (always becomes a string); `value` is `${{ … }}` (keeps its type). */
export type ReferenceForm = 'text' | 'value';

/** One `{{ … }}` or `${{ … }}` found in a text, by position only: no type, no meaning. */
export interface ReferenceSpan {
  /** Offset of the first delimiter character (the `$` of `${{`). */
  readonly start: number;
  /** Offset just past the closing `}}`. */
  readonly end: number;
  /** Length of the opening delimiter: 2 for `{{`, 3 for `${{`. */
  readonly openLength: number;
  /** What is between the delimiters, without whitespace-control dashes, trimmed. May be empty. */
  readonly expression: string;
  readonly form: ReferenceForm;
}

const OPEN = '{{';
const CLOSE = '}}';

/**
 * The index of the `}}` that ends an expression beginning at `from`, or -1. Quoted strings are
 * skipped when `quoteAware`, so a `}}` inside one does not end it.
 */
const findClose = (text: string, from: number, quoteAware: boolean): number => {
  if (!quoteAware) return text.indexOf(CLOSE, from);
  let quote: string | undefined;
  for (let index = from; index < text.length; index++) {
    const char = text[index];
    if (quote) {
      if (char === quote) quote = undefined;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '}' && text[index + 1] === '}') {
      return index;
    }
  }
  return -1;
};

/** Liquid's whitespace control: `{{-` and `-}}` trim the text around, they are not the expression. */
const expressionOf = (raw: string): string => {
  const withoutOpeningDash = raw.startsWith('-') ? raw.slice(1) : raw;
  const withoutDashes = withoutOpeningDash.endsWith('-')
    ? withoutOpeningDash.slice(0, -1)
    : withoutOpeningDash;
  return withoutDashes.trim();
};

/**
 * Finds every reference in `text`, in order. The one place that knows where a reference starts
 * and ends; everything that recognises references builds on it.
 *
 * - A `}}` inside a quoted string does not end a reference.
 * - A quote that never closes (a reference being typed) falls back to the first `}}`. Once that
 *   happens the rest of the text is read the same way, which keeps the scan linear.
 * - Malformed text is read leniently: a stray `}` stays outside, an inner `{{` stays inside.
 * - Liquid tags (`{% %}`) are not references.
 */
export const scanReferenceSpans = (text: string): ReferenceSpan[] => {
  const spans: ReferenceSpan[] = [];
  let quoteAware = true;
  let cursor = 0;
  while (cursor < text.length) {
    const open = text.indexOf(OPEN, cursor);
    if (open === -1) break;
    const from = open + OPEN.length;
    let close = findClose(text, from, quoteAware);
    if (close === -1 && quoteAware) {
      quoteAware = false;
      close = findClose(text, from, false);
    }
    if (close === -1) break;

    const isValueForm = open > 0 && text[open - 1] === '$';
    const end = close + CLOSE.length;
    spans.push({
      start: isValueForm ? open - 1 : open,
      end,
      openLength: isValueForm ? OPEN.length + 1 : OPEN.length,
      expression: expressionOf(text.slice(from, close)),
      form: isValueForm ? 'value' : 'text',
    });
    cursor = end;
  }
  return spans;
};

/**
 * Rebuilds `text` with each reference replaced by what `rewrite` returns for it (given the
 * reference's own source text). Text outside references is kept as it is.
 */
export const rewriteReferenceSpans = (
  text: string,
  rewrite: (span: ReferenceSpan, source: string) => string
): string => {
  let rebuilt = '';
  let cursor = 0;
  for (const span of scanReferenceSpans(text)) {
    rebuilt += text.slice(cursor, span.start) + rewrite(span, text.slice(span.start, span.end));
    cursor = span.end;
  }
  return rebuilt + text.slice(cursor);
};

/** Blanks out quoted text so operators and pipes inside a string literal don't count. */
export const blankQuoted = (expression: string): string =>
  expression.replace(/'[^']*'|"[^"]*"/g, (quoted) => '_'.repeat(quoted.length));

/** True when the expression pipes through a filter (`| json`, `| size`); a pipe in a string does not. */
export const hasFilter = (expression: string): boolean => blankQuoted(expression).includes('|');
