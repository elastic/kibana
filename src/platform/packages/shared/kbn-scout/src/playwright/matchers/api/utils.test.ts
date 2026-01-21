/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createMatcherError } from './utils';

describe('createMatcherError', () => {
  it('creates error with expected format', () => {
    const error = createMatcherError({
      expected: 200,
      matcherName: 'toHaveStatusCode',
      received: 404,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('expect(');
    expect(error.message).toContain('toHaveStatusCode');
    expect(error.message).toContain('Expected:');
    expect(error.message).toContain('200');
    expect(error.message).toContain('Received:');
    expect(error.message).toContain('404');
  });

  it('includes "not" in expected when negated', () => {
    const error = createMatcherError({
      expected: 200,
      matcherName: 'toHaveStatusCode',
      received: 200,
      isNegated: true,
    });

    expect(error.message).toContain('Expected: not');
  });

  it('skips stack lines when skipStackLines is provided', () => {
    const errorWithoutSkip = createMatcherError({
      expected: 200,
      matcherName: 'toHaveStatusCode',
      received: 404,
      skipStackLines: 0,
    });
    const errorWithSkip = createMatcherError({
      expected: 200,
      matcherName: 'toHaveStatusCode',
      received: 404,
      skipStackLines: 1,
    });

    const getStackLines = (err: Error) =>
      err.stack!.split('\n').filter((l) => l.trimStart().startsWith('at '));

    const stackLinesWithoutSkip = getStackLines(errorWithoutSkip);
    const stackLinesWithSkip = getStackLines(errorWithSkip);

    // After skipping 1 line, first stack line now points to current test file
    expect(stackLinesWithSkip[0]).toContain(__filename);

    // One less stack line
    expect(stackLinesWithSkip.length).toBe(stackLinesWithoutSkip.length - 1);

    // Message content is preserved
    expect(errorWithSkip.stack).toContain('toHaveStatusCode');
    expect(errorWithSkip.stack).toContain('Expected:');
    expect(errorWithSkip.stack).toContain('Received:');
  });
});
