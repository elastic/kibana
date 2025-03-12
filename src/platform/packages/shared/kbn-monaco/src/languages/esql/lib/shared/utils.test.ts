/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { offsetRangeToMonacoRange } from './utils';

describe('offsetRangeToMonacoRange', () => {
  test('should convert offset range to monaco range when the cursor is not at the end', () => {
    const expression = 'FROM test | WHERE test == | LIMIT 1';
    const range = { start: 26, end: 26 };
    const monacoRange = offsetRangeToMonacoRange(expression, range);

    expect(monacoRange).toEqual({
      startColumn: 26,
      endColumn: 26,
      startLineNumber: 1,
      endLineNumber: 1,
    });
  });

  test('should convert offset range to monaco range when the cursor is at the end', () => {
    const expression = 'FROM test | WHERE test == 1 | LIMIT 1';
    const range = { start: 37, end: 37 };
    const monacoRange = offsetRangeToMonacoRange(expression, range);

    expect(monacoRange).toEqual({
      startColumn: 37,
      endColumn: 37,
      startLineNumber: 1,
      endLineNumber: 1,
    });
  });

  test('should convert offset range to monaco range for multiple lines query when the cursor is not at the end', () => {
    const expression = 'FROM test \n| WHERE test == \n| LIMIT 1';
    const range = { start: 27, end: 27 };
    const monacoRange = offsetRangeToMonacoRange(expression, range);

    expect(monacoRange).toEqual({
      startColumn: 16,
      endColumn: 16,
      startLineNumber: 2,
      endLineNumber: 2,
    });
  });

  test('should convert offset range to monaco range for multiple lines query when the cursor is at the end', () => {
    const expression = 'FROM test \n| WHERE test == \n| LIMIT 1';
    const range = { start: 35, end: 35 };
    const monacoRange = offsetRangeToMonacoRange(expression, range);

    expect(monacoRange).toEqual({
      startColumn: 7,
      endColumn: 7,
      startLineNumber: 3,
      endLineNumber: 3,
    });
  });
});
