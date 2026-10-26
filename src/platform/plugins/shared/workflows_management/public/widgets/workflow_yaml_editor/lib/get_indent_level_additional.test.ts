/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getIndentLevel, getIndentLevelFromLineNumber } from './get_indent_level';
import { createMockMonacoModel } from '../../../shared/test_utils/mock_monaco';

describe('getIndentLevel - additional coverage', () => {
  it('handles a line with no leading whitespace but special characters', () => {
    expect(getIndentLevel('- item')).toBe(0);
  });
});

describe('getIndentLevelFromLineNumber - additional coverage', () => {
  it('correctly uses the model to get the line content', () => {
    const model = createMockMonacoModel(
      'version: "1"\n  name: test\n    steps:\n      - type: foo'
    );

    expect(getIndentLevelFromLineNumber(model, 1)).toBe(0);
    expect(getIndentLevelFromLineNumber(model, 2)).toBe(2);
    expect(getIndentLevelFromLineNumber(model, 3)).toBe(4);
    expect(getIndentLevelFromLineNumber(model, 4)).toBe(6);
  });

  it('returns 0 for a line with no indentation', () => {
    const model = createMockMonacoModel('no indent');
    expect(getIndentLevelFromLineNumber(model, 1)).toBe(0);
  });
});
