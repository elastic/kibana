/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { insertTextAtPosition } from './insert_text_at_position';

describe('insertTextAtPosition', () => {
  it('should replace text from column to end of line with the new text', () => {
    const yaml = `name: Test Workflow
connector: 
steps: []`;
    const result = insertTextAtPosition(yaml, { lineNumber: 2, column: 12 }, 'my-connector-id');
    expect(result).toBe(`name: Test Workflow
connector: my-connector-id
steps: []`);
  });

  it('should replace entire line when column is 1', () => {
    const yaml = `name: Test
old-value
steps: []`;
    const result = insertTextAtPosition(yaml, { lineNumber: 2, column: 1 }, 'new-value');
    expect(result).toBe(`name: Test
new-value
steps: []`);
  });

  it('should append text when column is beyond line length', () => {
    const yaml = `connector: `;
    const result = insertTextAtPosition(yaml, { lineNumber: 1, column: 20 }, 'id');
    expect(result).toBe(`connector: id`);
  });

  it('should return original string when lineNumber is less than 1', () => {
    const yaml = `line 1\nline 2`;
    const result = insertTextAtPosition(yaml, { lineNumber: 0, column: 1 }, 'x');
    expect(result).toBe(yaml);
  });

  it('should return original string when lineNumber exceeds line count', () => {
    const yaml = `line 1\nline 2`;
    const result = insertTextAtPosition(yaml, { lineNumber: 5, column: 1 }, 'x');
    expect(result).toBe(yaml);
  });

  it('should handle empty string', () => {
    const result = insertTextAtPosition('', { lineNumber: 1, column: 1 }, 'id');
    expect(result).toBe('');
  });

  it('should handle single line', () => {
    const yaml = 'connector: placeholder';
    // Column 12 is after "connector: " (11 chars), so we replace "placeholder" with "my-id"
    const result = insertTextAtPosition(yaml, { lineNumber: 1, column: 12 }, 'my-id');
    expect(result).toBe('connector: my-id');
  });
});
