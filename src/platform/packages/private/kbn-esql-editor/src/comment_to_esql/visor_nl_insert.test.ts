/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getVisorNlInsertPlan } from './visor_nl_insert';

const applyInsertAndReject = (original: string, generated: string): string => {
  const originalLines = original.split('\n');
  const plan = getVisorNlInsertPlan(originalLines, generated.split('\n'));
  if (!plan) {
    return original;
  }

  const lines = [...originalLines];
  if (plan.insert) {
    if (plan.insert.isLastLine) {
      const insertedLines = plan.insert.text.split('\n');
      const lineIdx = plan.review.lastChangedOriginalLine - 1;
      lines[lineIdx] = `${lines[lineIdx]}${insertedLines[0]}`;
      lines.splice(lineIdx + 1, 0, ...insertedLines.slice(1));
    } else {
      const text = plan.insert.text;
      const insertedLines = text.endsWith('\n') ? text.slice(0, -1).split('\n') : text.split('\n');
      lines.splice(plan.review.lastChangedOriginalLine, 0, ...insertedLines);
    }
  }

  const { generatedLineStart, generatedLineEnd } = plan.review;
  if (generatedLineEnd >= generatedLineStart) {
    // Mirrors useReplaceReview.reject: drop generated lines, keep the original line.
    lines.splice(generatedLineStart - 1, generatedLineEnd - generatedLineStart + 1);
  }
  return lines.join('\n');
};

describe('getVisorNlInsertPlan', () => {
  it('replaces the last line without a trailing newline that Undo cannot remove', () => {
    const original = 'FROM logs';
    const generated = 'FROM metrics';
    const plan = getVisorNlInsertPlan(original.split('\n'), generated.split('\n'));

    expect(plan).toEqual({
      review: {
        firstChangedOriginalLine: 1,
        lastChangedOriginalLine: 1,
        generatedLineStart: 2,
        generatedLineEnd: 2,
      },
      insert: { isLastLine: true, text: '\nFROM metrics' },
    });
    expect(applyInsertAndReject(original, generated)).toBe(original);
  });

  it('keeps a mid-query suffix on its own line', () => {
    const original = 'FROM logs\n| WHERE x\n| LIMIT 10';
    const generated = 'FROM logs\n| WHERE y\n| LIMIT 10';
    const plan = getVisorNlInsertPlan(original.split('\n'), generated.split('\n'));

    expect(plan).toEqual({
      review: {
        firstChangedOriginalLine: 2,
        lastChangedOriginalLine: 2,
        generatedLineStart: 3,
        generatedLineEnd: 3,
      },
      insert: { isLastLine: false, text: '| WHERE y\n' },
    });
    expect(applyInsertAndReject(original, generated)).toBe(original);
  });

  it('does not insert blank lines when the generated query only removes trailing lines', () => {
    const original = 'FROM logs\n| LIMIT 10';
    const generated = 'FROM logs';
    const plan = getVisorNlInsertPlan(original.split('\n'), generated.split('\n'));

    expect(plan).toEqual({
      review: {
        firstChangedOriginalLine: 2,
        lastChangedOriginalLine: 2,
        generatedLineStart: 3,
        generatedLineEnd: 2,
      },
      insert: null,
    });
    expect(applyInsertAndReject(original, generated)).toBe(original);
  });

  it('appends new trailing clauses without a leftover blank line after Undo', () => {
    const original = 'FROM logs';
    const generated = 'FROM logs\n| LIMIT 10';
    const plan = getVisorNlInsertPlan(original.split('\n'), generated.split('\n'));

    expect(plan?.insert).toEqual({ isLastLine: true, text: '\n| LIMIT 10' });
    expect(applyInsertAndReject(original, generated)).toBe(original);
  });

  it('returns null when the generated query is unchanged', () => {
    expect(getVisorNlInsertPlan(['FROM logs'], ['FROM logs'])).toBeNull();
  });
});
