/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { indexPatternRt } from '.';
import { isRight } from 'fp-ts/lib/Either';

describe('indexPatternRt', () => {
  test('passes on valid index pattern strings', () => {
    expect(isRight(indexPatternRt.decode('logs-*'))).toBe(true);
    expect(isRight(indexPatternRt.decode('logs-*,filebeat-*'))).toBe(true);
  });

  test('fails if the pattern is an empty string', () => {
    expect(isRight(indexPatternRt.decode(''))).toBe(false);
  });

  test('fails if the pattern contains empty spaces', () => {
    expect(isRight(indexPatternRt.decode(' '))).toBe(false);
    expect(isRight(indexPatternRt.decode(' logs-*'))).toBe(false);
    expect(isRight(indexPatternRt.decode('logs-* '))).toBe(false);
    expect(isRight(indexPatternRt.decode('logs-*, filebeat-*'))).toBe(false);
  });

  test('fails if the pattern contains empty comma-separated entries', () => {
    expect(isRight(indexPatternRt.decode(',logs-*'))).toBe(false);
    expect(isRight(indexPatternRt.decode('logs-*,'))).toBe(false);
    expect(isRight(indexPatternRt.decode('logs-*,,filebeat-*'))).toBe(false);
    expect(isRight(indexPatternRt.decode('logs-*,,,filebeat-*'))).toBe(false);
  });
});
