/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getIndentLevel, getIndentLevelFromLineNumber } from './get_indent_level';

describe('getIndentLevel', () => {
  it.each([
    ['no indent', 'hello', 0],
    ['two spaces', '  hello', 2],
    ['four spaces', '    hello', 4],
    ['empty string', '', 0],
    ['only spaces', '    ', 4],
    ['tab character', '\thello', 1],
  ])('%s: "%s" → %d', (_label, input, expected) => {
    expect(getIndentLevel(input)).toBe(expected);
  });
});

describe('getIndentLevelFromLineNumber', () => {
  it('delegates to getIndentLevel with line content from model', () => {
    const mockModel = {
      getLineContent: jest.fn().mockReturnValue('    content'),
    };
    expect(getIndentLevelFromLineNumber(mockModel as never, 3)).toBe(4);
    expect(mockModel.getLineContent).toHaveBeenCalledWith(3);
  });
});
