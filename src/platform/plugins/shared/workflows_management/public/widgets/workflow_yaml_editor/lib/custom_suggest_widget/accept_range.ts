/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';

/** Minimal subset of monaco.IRange we rely on, so this module is unit-testable. */
export interface RangeLike {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface TextEditLike {
  range: RangeLike;
  text: string | null | undefined;
}

export interface PositionLike {
  lineNumber: number;
  column: number;
}

export interface AcceptPlan {
  /** Union of main range and any adjacent empty-text additionalTextEdits. */
  unionRange: RangeLike;
  /** Edits that couldn't be folded into unionRange (multi-line, non-empty text). */
  nonAdjacentEdits: Array<{ range: RangeLike; text: string }>;
}

const unionRange = (a: RangeLike, b: RangeLike): RangeLike => ({
  startLineNumber: a.startLineNumber,
  startColumn: Math.min(a.startColumn, b.startColumn),
  endLineNumber: a.endLineNumber,
  endColumn: Math.max(a.endColumn, b.endColumn),
});

/**
 * Compute the replacement range for accept-suggestion, folding any same-line
 * adjacent additionalTextEdits (e.g., the edit that removes a `@` trigger)
 * into the main range so they can be applied in a single transaction.
 *
 * The bug this defends against: running the main edit and the additionalTextEdit
 * as two separate executeEdits calls leaves the `@` in place because the second
 * call's coordinates don't compose with the first's position shifts — a user
 * accepting `workflow` after `@` ends up with `@workflow` instead of `{{ workflow }}`.
 */
export const planAcceptRange = (
  itemRange: RangeLike,
  cursor: PositionLike,
  additionalTextEdits: readonly TextEditLike[] | undefined
): AcceptPlan => {
  const mainRange: RangeLike = {
    startLineNumber: itemRange.startLineNumber,
    startColumn: itemRange.startColumn,
    endLineNumber: cursor.lineNumber,
    endColumn: cursor.column,
  };

  let merged = mainRange;
  const nonAdjacentEdits: Array<{ range: RangeLike; text: string }> = [];

  for (const edit of additionalTextEdits ?? []) {
    const r = edit.range;
    const text = edit.text ?? '';
    const sameLine =
      r.startLineNumber === mainRange.startLineNumber &&
      r.endLineNumber === mainRange.endLineNumber;
    const adjacent =
      sameLine &&
      text === '' &&
      r.endColumn >= merged.startColumn &&
      r.startColumn <= merged.endColumn;
    if (adjacent) {
      merged = unionRange(merged, r);
    } else {
      nonAdjacentEdits.push({ range: r, text });
    }
  }

  return { unionRange: merged, nonAdjacentEdits };
};

/** Convenience: shape the plan back into monaco.IRange / text edits for executeEdits. */
export const toMonacoEdits = (
  plan: AcceptPlan,
  monacoRef: typeof monaco
): {
  mainRange: monaco.IRange;
  nonAdjacent: Array<{ range: monaco.IRange; text: string }>;
} => ({
  mainRange: new monacoRef.Range(
    plan.unionRange.startLineNumber,
    plan.unionRange.startColumn,
    plan.unionRange.endLineNumber,
    plan.unionRange.endColumn
  ),
  nonAdjacent: plan.nonAdjacentEdits.map((e) => ({
    range: new monacoRef.Range(
      e.range.startLineNumber,
      e.range.startColumn,
      e.range.endLineNumber,
      e.range.endColumn
    ),
    text: e.text,
  })),
});
