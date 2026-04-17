/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { planAcceptRange } from './accept_range';

describe('planAcceptRange', () => {
  it('returns the main range unchanged when there are no additionalTextEdits', () => {
    const plan = planAcceptRange(
      { startLineNumber: 5, startColumn: 18, endLineNumber: 5, endColumn: 18 },
      { lineNumber: 5, column: 18 },
      undefined
    );
    expect(plan.unionRange).toEqual({
      startLineNumber: 5,
      startColumn: 18,
      endLineNumber: 5,
      endColumn: 18,
    });
    expect(plan.nonAdjacentEdits).toEqual([]);
  });

  it('folds an adjacent @ removal into the main range so accept drops the trigger', () => {
    // Regression guard: the @ at col 17 + empty replacement range at col 18
    // must be merged so executeEdits receives a single [17, 18] range instead
    // of two separate calls whose coordinates don't compose.
    const plan = planAcceptRange(
      { startLineNumber: 5, startColumn: 18, endLineNumber: 5, endColumn: 18 },
      { lineNumber: 5, column: 18 },
      [
        {
          range: { startLineNumber: 5, startColumn: 17, endLineNumber: 5, endColumn: 18 },
          text: '',
        },
      ]
    );
    expect(plan.unionRange).toEqual({
      startLineNumber: 5,
      startColumn: 17,
      endLineNumber: 5,
      endColumn: 18,
    });
    expect(plan.nonAdjacentEdits).toEqual([]);
  });

  it('folds when the typed word grew past the initial itemRange', () => {
    // itemRange covers the trigger-word slot; the cursor has since advanced as
    // the user kept typing. Main range must extend to the cursor, and the
    // adjacent @ removal at [17, 18] must still fold.
    const plan = planAcceptRange(
      { startLineNumber: 5, startColumn: 18, endLineNumber: 5, endColumn: 18 },
      { lineNumber: 5, column: 22 },
      [
        {
          range: { startLineNumber: 5, startColumn: 17, endLineNumber: 5, endColumn: 18 },
          text: '',
        },
      ]
    );
    expect(plan.unionRange).toEqual({
      startLineNumber: 5,
      startColumn: 17,
      endLineNumber: 5,
      endColumn: 22,
    });
  });

  it('does not fold edits on a different line', () => {
    const plan = planAcceptRange(
      { startLineNumber: 5, startColumn: 18, endLineNumber: 5, endColumn: 18 },
      { lineNumber: 5, column: 18 },
      [
        {
          range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5 },
          text: '',
        },
      ]
    );
    expect(plan.unionRange.startColumn).toBe(18);
    expect(plan.nonAdjacentEdits).toHaveLength(1);
    expect(plan.nonAdjacentEdits[0].range.startLineNumber).toBe(1);
  });

  it('does not fold edits with non-empty text (treats them as separate edits)', () => {
    const plan = planAcceptRange(
      { startLineNumber: 5, startColumn: 18, endLineNumber: 5, endColumn: 18 },
      { lineNumber: 5, column: 18 },
      [
        {
          range: { startLineNumber: 5, startColumn: 17, endLineNumber: 5, endColumn: 18 },
          text: 'X',
        },
      ]
    );
    expect(plan.unionRange).toEqual({
      startLineNumber: 5,
      startColumn: 18,
      endLineNumber: 5,
      endColumn: 18,
    });
    expect(plan.nonAdjacentEdits).toHaveLength(1);
    expect(plan.nonAdjacentEdits[0].text).toBe('X');
  });

  it('does not fold non-adjacent same-line removals', () => {
    const plan = planAcceptRange(
      { startLineNumber: 5, startColumn: 18, endLineNumber: 5, endColumn: 18 },
      { lineNumber: 5, column: 18 },
      [
        {
          range: { startLineNumber: 5, startColumn: 1, endLineNumber: 5, endColumn: 5 },
          text: '',
        },
      ]
    );
    expect(plan.unionRange.startColumn).toBe(18);
    expect(plan.nonAdjacentEdits).toHaveLength(1);
  });

  it('folds multiple adjacent edits cumulatively', () => {
    const plan = planAcceptRange(
      { startLineNumber: 5, startColumn: 18, endLineNumber: 5, endColumn: 18 },
      { lineNumber: 5, column: 18 },
      [
        {
          range: { startLineNumber: 5, startColumn: 17, endLineNumber: 5, endColumn: 18 },
          text: '',
        },
        {
          range: { startLineNumber: 5, startColumn: 15, endLineNumber: 5, endColumn: 17 },
          text: '',
        },
      ]
    );
    expect(plan.unionRange).toEqual({
      startLineNumber: 5,
      startColumn: 15,
      endLineNumber: 5,
      endColumn: 18,
    });
    expect(plan.nonAdjacentEdits).toEqual([]);
  });

  it('treats null text on an edit the same as empty string', () => {
    const plan = planAcceptRange(
      { startLineNumber: 5, startColumn: 18, endLineNumber: 5, endColumn: 18 },
      { lineNumber: 5, column: 18 },
      [
        {
          range: { startLineNumber: 5, startColumn: 17, endLineNumber: 5, endColumn: 18 },
          text: null,
        },
      ]
    );
    expect(plan.unionRange.startColumn).toBe(17);
  });
});
