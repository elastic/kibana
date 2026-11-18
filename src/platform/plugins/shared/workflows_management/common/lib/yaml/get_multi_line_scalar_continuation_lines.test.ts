/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LineCounter, parseDocument } from 'yaml';
import { getMultiLineScalarContinuationLines } from './get_multi_line_scalar_continuation_lines';

const linesOf = (yaml: string): number[] => {
  const lineCounter = new LineCounter();
  const doc = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
  return [...getMultiLineScalarContinuationLines(doc, lineCounter)].sort((a, b) => a - b);
};

describe('getMultiLineScalarContinuationLines', () => {
  it('returns nothing for single-line scalars', () => {
    expect(linesOf('a: 1\nb: "two"\nc: three\n')).toEqual([]);
  });

  it('returns the lines after the first one of a multi-line double-quoted scalar', () => {
    const yaml = ['a: 1', 'text: "line one', '  **Evidence:** x', '  done"', 'b: 2', ''].join('\n');

    expect(linesOf(yaml)).toEqual([3, 4]);
  });

  it('returns the content lines of a block scalar, not the key line after it', () => {
    const yaml = ['text: |', '  line one', '  **Evidence:** x', 'next: *alias', ''].join('\n');

    expect(linesOf(yaml)).toEqual([2, 3]);
  });

  it('returns the continuation lines of a multi-line plain scalar', () => {
    const yaml = ['text: first', '  second **Evidence:** x', 'b: 2', ''].join('\n');

    expect(linesOf(yaml)).toEqual([2]);
  });

  it('finds scalars nested in flow collections', () => {
    const yaml = [
      'steps: [',
      '  { name: a, with: { text: "one\\n',
      '      **Evidence:** x\\n',
      '      done" } },',
      '  { name: b }',
      ']',
      '',
    ].join('\n');

    expect(linesOf(yaml)).toEqual([3, 4]);
  });

  it('returns nothing for an empty document', () => {
    expect(linesOf('')).toEqual([]);
  });
});
