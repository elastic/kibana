/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HIGHLIGHT_TOKEN, highlightMatches } from './highlight_matches';

describe('highlightMatches', () => {
  describe('basic functionality', () => {
    test('should highlight simple text matches', () => {
      const text = 'This is a test string';
      const searchText = 'test';
      const result = highlightMatches(text, searchText);

      expect(result).toBe(`This is a ${HIGHLIGHT_TOKEN}test${HIGHLIGHT_TOKEN} string`);
    });

    test('should handle multiple matches', () => {
      const text = 'test this test that test';
      const searchText = 'test';
      const result = highlightMatches(text, searchText);

      expect(result).toBe(
        `${HIGHLIGHT_TOKEN}test${HIGHLIGHT_TOKEN} this ${HIGHLIGHT_TOKEN}test${HIGHLIGHT_TOKEN} that ${HIGHLIGHT_TOKEN}test${HIGHLIGHT_TOKEN}`
      );
    });

    test('should be case-insensitive', () => {
      const text = 'Test this TEST that tEsT';
      const searchText = 'test';
      const result = highlightMatches(text, searchText);

      expect(result).toBe(
        `${HIGHLIGHT_TOKEN}Test${HIGHLIGHT_TOKEN} this ${HIGHLIGHT_TOKEN}TEST${HIGHLIGHT_TOKEN} that ${HIGHLIGHT_TOKEN}tEsT${HIGHLIGHT_TOKEN}`
      );
    });

    test('should handle text with no matches', () => {
      const text = 'This string has no matches';
      const searchText = 'xyz';
      const result = highlightMatches(text, searchText);

      expect(result).toBe(text);
    });
  });

  test('should escape regex special characters in search text', () => {
    const text = 'Use regex like [a-z]+ or .*? patterns';
    const searchText = '[a-z]+';
    const result = highlightMatches(text, searchText);

    expect(result).toBe(
      `Use regex like ${HIGHLIGHT_TOKEN}[a-z]+${HIGHLIGHT_TOKEN} or .*? patterns`
    );
  });

  describe('markdown protected blocks', () => {
    test('should not highlight text inside multi-line code blocks', () => {
      const text = `
Here is some text with test.
\`\`\`
This is a test in a code block
\`\`\`
And more test outside.
      `.trim();
      const searchText = 'test';
      const result = highlightMatches(text, searchText);

      expect(result).toContain(`Here is some text with ${HIGHLIGHT_TOKEN}test${HIGHLIGHT_TOKEN}.`);
      expect(result).toContain(`And more ${HIGHLIGHT_TOKEN}test${HIGHLIGHT_TOKEN} outside.`);
      expect(result).toContain('```\nThis is a test in a code block\n```');
    });

    test('should not highlight text inside inline code', () => {
      const text = 'Use the `test` function to test your code';
      const searchText = 'test';
      const result = highlightMatches(text, searchText);

      expect(result).toBe(
        `Use the \`test\` function to ${HIGHLIGHT_TOKEN}test${HIGHLIGHT_TOKEN} your code`
      );
    });

    test('should not highlight text inside markdown links', () => {
      const text = 'Check out [test documentation](http://example.com/test) for more test info';
      const searchText = 'test';
      const result = highlightMatches(text, searchText);

      expect(result).toBe(
        `Check out [test documentation](http://example.com/test) for more ${HIGHLIGHT_TOKEN}test${HIGHLIGHT_TOKEN} info`
      );
    });
  });
});
