/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { correctYamlSyntax } from './correct_yaml_syntax';

describe('correctYamlSyntax', () => {
  describe('closing unclosed quotes', () => {
    it('should close unclosed single quotes in values', () => {
      const input = `name: 'test workflow`;
      const expected = `name: 'test workflow'`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });

    it('should close unclosed double quotes in values', () => {
      const input = `description: "This is a description`;
      const expected = `description: "This is a description"`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });

    it('should handle multiple lines with unclosed quotes', () => {
      const input = `name: 'test workflow
description: "Another unclosed quote
enabled: true`;
      const expected = `name: 'test workflow'
description: "Another unclosed quote"
enabled: true`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });

    it('should not modify properly closed quotes', () => {
      const input = `name: 'test workflow'
description: "Properly closed"
value: 'also closed'`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should handle empty values', () => {
      const input = `name: 
description: ""
enabled: true`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should only close quotes that start a value after colon', () => {
      const input = `name: test ' value
description: 'unclosed at start`;
      const expected = `name: test ' value
description: 'unclosed at start'`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });

    it('should handle nested quotes correctly', () => {
      const input = `message: "He said 'hello' to me"`;
      expect(correctYamlSyntax(input)).toBe(input);
    });
  });

  describe('wrapping special characters', () => {
    it('should wrap @ symbol at the beginning of values', () => {
      const input = `user: @username`;
      const expected = `user: "@username"`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });

    it('should wrap values starting with special characters', () => {
      const testCases = [
        { input: `value: !important`, expected: `value: "!important"` },
        { input: `value: #hashtag`, expected: `value: "#hashtag"` },
        { input: `value: $variable`, expected: `value: "$variable"` },
        { input: `value: %percentage`, expected: `value: "%percentage"` },
        { input: `value: ^caret`, expected: `value: "^caret"` },
        { input: `value: &reference`, expected: `value: "&reference"` },
        { input: `value: *pointer`, expected: `value: "*pointer"` },
        { input: `value: |pipe`, expected: `value: "|pipe"` },
        { input: `value: \\backslash`, expected: `value: "\\backslash"` },
        { input: `value: >folded`, expected: `value: ">folded"` },
        { input: `value: <tag>`, expected: `value: "<tag>"` },
        { input: `value: ?question`, expected: `value: "?question"` },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(correctYamlSyntax(input)).toBe(expected);
      });
    });

    it('should wrap invalid brace patterns but not valid YAML flow syntax', () => {
      const testCases = [
        // Invalid patterns that should be wrapped
        { input: `value: {object}`, expected: `value: "{object}"` },
        { input: `value: { object}`, expected: `value: "{ object}"` },
        { input: `value: {object }`, expected: `value: "{object }"` },
        { input: `value: { object }`, expected: `value: "{ object }"` },

        // Valid YAML flow syntax that should NOT be wrapped
        { input: `value: {}`, expected: `value: {}` },
        { input: `value: { }`, expected: `value: { }` },
        { input: `value: { key: value }`, expected: `value: { key: value }` },
        { input: `value: {key: value}`, expected: `value: {key: value}` },
        { input: `value: { name: "test", id: 123 }`, expected: `value: { name: "test", id: 123 }` },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(correctYamlSyntax(input)).toBe(expected);
      });
    });

    it('should handle square brackets conservatively', () => {
      const testCases = [
        // Arrays should generally not be wrapped as they're likely valid flow syntax
        { input: `value: []`, expected: `value: []` },
        { input: `value: [ ]`, expected: `value: [ ]` },
        { input: `value: [array]`, expected: `value: [array]` },
        { input: `value: [item1, item2]`, expected: `value: [item1, item2]` },
        { input: `value: [ "item1", "item2" ]`, expected: `value: [ "item1", "item2" ]` },

        // Incomplete arrays (being typed) should not be wrapped
        { input: `value: [incomplete`, expected: `value: [incomplete` },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(correctYamlSyntax(input)).toBe(expected);
      });
    });

    it('should not wrap email addresses', () => {
      const input = `email: user@example.com`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should wrap @ symbol in non-email contexts', () => {
      const input = `message: Hello @user how are you`;
      const expected = `message: "Hello @user how are you"`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });

    it('should not wrap already quoted values', () => {
      const input = `value1: "@username"
value2: '#hashtag'`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should skip comment lines', () => {
      const input = `# This is a comment with @special characters!
name: test`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should handle indented values', () => {
      const input = `steps:
  - name: step1
    with:
      message: @mention`;
      const expected = `steps:
  - name: step1
    with:
      message: "@mention"`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });

    it('should preserve leading spaces in values', () => {
      const input = `name:   @username`;
      const expected = `name:   "@username"`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });
  });

  describe('combined scenarios', () => {
    it('should handle both unclosed quotes and special characters', () => {
      const input = `name: 'workflow
user: @admin
description: "Test with special #chars`;
      const expected = `name: 'workflow'
user: "@admin"
description: "Test with special #chars"`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });

    it('should handle complex YAML structures', () => {
      const input = `workflow:
  name: 'My Workflow
  steps:
    - type: action
      with:
        user: @bot
        message: "Send notification
    - type: log
      with:
        tag: #important`;
      const expected = `workflow:
  name: 'My Workflow'
  steps:
    - type: action
      with:
        user: "@bot"
        message: "Send notification"
    - type: log
      with:
        tag: "#important"`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });

    it('should handle multiline strings correctly', () => {
      const input = `description: |
  This is a multiline
  string with @mentions
  and special characters`;
      // Multiline strings starting with | should not be modified
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should handle empty YAML', () => {
      expect(correctYamlSyntax('')).toBe('');
    });

    it('should handle YAML with only comments', () => {
      const input = `# Comment 1
# Comment 2`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should not wrap special characters in the middle of values', () => {
      const input = `equation: 2 + 2 = 4`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should handle keys without values', () => {
      const input = `name:
description:
enabled:`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should handle boolean and numeric values', () => {
      const input = `enabled: true
count: 42
percentage: 100.5`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should handle braces and brackets in complex scenarios', () => {
      const input = `workflow:
  name: 'My Workflow
  config: {invalid}
  validConfig: { key: "value" }
  items: [item1, item2]
  invalidBrace: { object }
  emptyObject: {}
  steps:
    - with:
        data: {malformed`;
      const expected = `workflow:
  name: 'My Workflow'
  config: "{invalid}"
  validConfig: { key: "value" }
  items: [item1, item2]
  invalidBrace: "{ object }"
  emptyObject: {}
  steps:
    - with:
        data: "{malformed"`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });
  });
});
