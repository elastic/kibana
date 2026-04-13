/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { prependIndentToLines } from './prepend_indent_to_lines';

describe('prependIndentToLines - additional coverage', () => {
  it('handles multiple consecutive empty lines', () => {
    expect(prependIndentToLines('a\n\n\nb', 2)).toBe('  a\n\n\n  b');
  });

  it('handles lines with only whitespace (they are non-empty and get indented)', () => {
    // A line with spaces has length > 0 so it gets indented
    expect(prependIndentToLines('  ', 2)).toBe('    ');
  });

  it('handles a trailing newline', () => {
    // The last element after split will be '' which is empty, so no indent
    expect(prependIndentToLines('a\nb\n', 2)).toBe('  a\n  b\n');
  });

  it('handles multi-line yaml content', () => {
    const yaml = 'steps:\n  - name: step1\n    type: test';
    const result = prependIndentToLines(yaml, 4);
    expect(result).toBe('    steps:\n      - name: step1\n        type: test');
  });
});
