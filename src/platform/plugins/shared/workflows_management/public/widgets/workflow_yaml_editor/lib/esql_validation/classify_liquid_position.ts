/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Classifies how Liquid expressions sit inside an ES|QL query string.
 *
 * Workflow authors interpolate Liquid into ES|QL — most often inside a quoted
 * string literal (`WHERE host == "{{ inputs.host }}"`), occasionally as a
 * structural fragment of the query itself (`FROM logs-{{ inputs.env }}-*`).
 * The latter cannot be validated honestly at edit time: replacing the Liquid
 * span with whitespace leaves the ES|QL parser staring at gaps where it
 * expected an identifier, keyword, or numeric literal, and it dutifully
 * reports false-positive syntax errors that the workflow author can't act on.
 *
 * This classifier walks the query once with awareness of:
 *   - double-quoted strings (`"…"`),
 *   - triple-quoted strings (`"""…"""`),
 *   - ES|QL line comments (`// …`),
 *   - ES|QL block comments (`/* … *​/`),
 *
 * and decides whether every Liquid span sits in a "safe" position (inside a
 * string or comment, or itself a Liquid comment `{# … #}`) or whether at
 * least one span is structural. The validator skips the entire region in the
 * structural case, mirroring the policy KQL validation already uses for
 * `triggers[].on.condition` and step `if` conditions.
 */

/**
 * Which Liquid construct produced this masked span. Autocomplete uses it to
 * distinguish a Liquid comment — where the user is writing prose and any
 * popup is wrong — from a `{{ … }}` / `{% … %}` block where deferring to
 * variable / Liquid completions is the right move.
 */
export type LiquidMaskedRangeKind = 'expression' | 'tag' | 'comment';

export interface LiquidMaskedRange {
  start: number;
  end: number;
  kind: LiquidMaskedRangeKind;
}

export type LiquidPositionClass =
  | { kind: 'safe'; maskedRanges: ReadonlyArray<LiquidMaskedRange> }
  | { kind: 'has-structural' };

const TRIPLE_QUOTE = '"""';
const LINE_COMMENT_OPEN = '//';
const BLOCK_COMMENT_OPEN = '/*';
const BLOCK_COMMENT_CLOSE = '*/';
const LIQUID_VAR_OPEN = '{{';
const LIQUID_VAR_CLOSE = '}}';
const LIQUID_TAG_OPEN = '{%';
const LIQUID_TAG_CLOSE = '%}';
const LIQUID_COMMENT_OPEN = '{#';
const LIQUID_COMMENT_CLOSE = '#}';

type ScannerState = 'normal' | 'string-double' | 'string-triple' | 'line-comment' | 'block-comment';

export function classifyLiquidPosition(text: string): LiquidPositionClass {
  if (!text || (!text.includes('{{') && !text.includes('{%') && !text.includes('{#'))) {
    return { kind: 'safe', maskedRanges: [] };
  }

  const masked: LiquidMaskedRange[] = [];
  let state: ScannerState = 'normal';
  let i = 0;

  while (i < text.length) {
    const step = scanLiquidStep(text, i, state);
    if (step.hasStructural) {
      return { kind: 'has-structural' };
    }
    if (step.maskedRange) {
      masked.push(step.maskedRange);
    }
    state = step.nextState;
    i = step.nextIndex;
  }

  return { kind: 'safe', maskedRanges: masked };
}

interface ScanStep {
  nextState: ScannerState;
  nextIndex: number;
  maskedRange?: LiquidMaskedRange;
  hasStructural?: boolean;
}

function scanLiquidStep(text: string, i: number, state: ScannerState): ScanStep {
  switch (state) {
    case 'normal':
      return scanNormalState(text, i);
    case 'string-double':
      return scanDoubleQuotedStringState(text, i);
    case 'string-triple':
      if (startsAt(text, i, TRIPLE_QUOTE)) {
        return { nextState: 'normal', nextIndex: i + TRIPLE_QUOTE.length };
      }
      return maskLiquidOrAdvance(text, i, 'string-triple');
    case 'line-comment':
      if (text[i] === '\n') {
        return { nextState: 'normal', nextIndex: i + 1 };
      }
      return maskLiquidOrAdvance(text, i, 'line-comment');
    case 'block-comment':
      if (startsAt(text, i, BLOCK_COMMENT_CLOSE)) {
        return { nextState: 'normal', nextIndex: i + BLOCK_COMMENT_CLOSE.length };
      }
      return maskLiquidOrAdvance(text, i, 'block-comment');
  }
}

function scanNormalState(text: string, i: number): ScanStep {
  if (startsAt(text, i, TRIPLE_QUOTE)) {
    return { nextState: 'string-triple', nextIndex: i + TRIPLE_QUOTE.length };
  }
  if (text[i] === '"') {
    return { nextState: 'string-double', nextIndex: i + 1 };
  }
  if (startsAt(text, i, LINE_COMMENT_OPEN)) {
    return { nextState: 'line-comment', nextIndex: i + LINE_COMMENT_OPEN.length };
  }
  if (startsAt(text, i, BLOCK_COMMENT_OPEN)) {
    return { nextState: 'block-comment', nextIndex: i + BLOCK_COMMENT_OPEN.length };
  }
  if (startsAt(text, i, LIQUID_VAR_OPEN) || startsAt(text, i, LIQUID_TAG_OPEN)) {
    return { nextState: 'normal', nextIndex: i, hasStructural: true };
  }
  if (startsAt(text, i, LIQUID_COMMENT_OPEN)) {
    const close = text.indexOf(LIQUID_COMMENT_CLOSE, i + LIQUID_COMMENT_OPEN.length);
    if (close === -1) {
      return { nextState: 'normal', nextIndex: i, hasStructural: true };
    }
    const end = close + LIQUID_COMMENT_CLOSE.length;
    return {
      nextState: 'normal',
      nextIndex: end,
      maskedRange: { start: i, end, kind: 'comment' },
    };
  }
  return { nextState: 'normal', nextIndex: i + 1 };
}

function scanDoubleQuotedStringState(text: string, i: number): ScanStep {
  if (text[i] === '\\' && i + 1 < text.length) {
    return { nextState: 'string-double', nextIndex: i + 2 };
  }
  if (text[i] === '"') {
    return { nextState: 'normal', nextIndex: i + 1 };
  }
  return maskLiquidOrAdvance(text, i, 'string-double');
}

function maskLiquidOrAdvance(text: string, i: number, state: ScannerState): ScanStep {
  const opener = matchLiquidOpen(text, i);
  if (opener !== null) {
    return {
      nextState: state,
      nextIndex: opener.end,
      maskedRange: { start: i, end: opener.end, kind: opener.kind },
    };
  }
  return { nextState: state, nextIndex: i + 1 };
}

/**
 * Replaces every span in `ranges` with a run of spaces of identical length so
 * line/column offsets in the surrounding ES|QL stay valid for the parser.
 * Caller is responsible for having computed the ranges (typically via
 * {@link classifyLiquidPosition}).
 */
export function applyLiquidMask(text: string, ranges: ReadonlyArray<LiquidMaskedRange>): string {
  if (ranges.length === 0) {
    return text;
  }
  let out = text;
  for (const range of ranges) {
    const len = range.end - range.start;
    out = out.slice(0, range.start) + ' '.repeat(len) + out.slice(range.end);
  }
  return out;
}

/** True if `offset` lies inside any of `ranges` (end-exclusive). */
export function isOffsetInsideMaskedRange(
  offset: number,
  ranges: ReadonlyArray<LiquidMaskedRange>
): boolean {
  return findMaskedRangeAtOffset(offset, ranges) !== null;
}

/** Returns the first masked range containing `offset` (end-exclusive), or `null`. */
export function findMaskedRangeAtOffset(
  offset: number,
  ranges: ReadonlyArray<LiquidMaskedRange>
): LiquidMaskedRange | null {
  for (const range of ranges) {
    if (offset >= range.start && offset < range.end) {
      return range;
    }
  }
  return null;
}

function startsAt(text: string, pos: number, marker: string): boolean {
  if (pos + marker.length > text.length) {
    return false;
  }
  for (let k = 0; k < marker.length; k++) {
    if (text[pos + k] !== marker[k]) {
      return false;
    }
  }
  return true;
}

interface LiquidOpenerMatch {
  /** Offset one past the closing delimiter (`}}`, `%}`, or `#}`). */
  end: number;
  kind: LiquidMaskedRangeKind;
}

function matchLiquidOpen(text: string, pos: number): LiquidOpenerMatch | null {
  if (startsAt(text, pos, LIQUID_VAR_OPEN)) {
    const close = text.indexOf(LIQUID_VAR_CLOSE, pos + LIQUID_VAR_OPEN.length);
    return close === -1 ? null : { end: close + LIQUID_VAR_CLOSE.length, kind: 'expression' };
  }
  if (startsAt(text, pos, LIQUID_TAG_OPEN)) {
    const close = text.indexOf(LIQUID_TAG_CLOSE, pos + LIQUID_TAG_OPEN.length);
    return close === -1 ? null : { end: close + LIQUID_TAG_CLOSE.length, kind: 'tag' };
  }
  if (startsAt(text, pos, LIQUID_COMMENT_OPEN)) {
    const close = text.indexOf(LIQUID_COMMENT_CLOSE, pos + LIQUID_COMMENT_OPEN.length);
    return close === -1 ? null : { end: close + LIQUID_COMMENT_CLOSE.length, kind: 'comment' };
  }
  return null;
}
