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
  describe('wrapping dangerous characters that cause data loss or crash', () => {
    it('should wrap ! at the beginning of values (YAML tag — causes data loss)', () => {
      const input = `value: !important`;
      const expected = `value: "!important"`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });

    it('should wrap # at the beginning of values (YAML comment — causes data loss)', () => {
      const input = `value: #hashtag`;
      const expected = `value: "#hashtag"`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });

    it('should wrap & at the beginning of values (YAML anchor — causes data loss)', () => {
      const input = `value: &reference`;
      const expected = `value: "&reference"`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });

    it('should wrap * at the beginning of values (YAML alias — causes crash)', () => {
      const input = `value: *pointer`;
      const expected = `value: "*pointer"`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });

    it('should wrap |pipe (non-multiline block scalar indicator — causes data loss)', () => {
      const input = `value: |pipe`;
      const expected = `value: "|pipe"`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });

    it('should wrap >folded (non-folded scalar indicator — causes data loss)', () => {
      const input = `value: >folded`;
      const expected = `value: ">folded"`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });

    it('should handle indented values', () => {
      const input = `steps:
  - name: step1
    with:
      tag: #important`;
      const expected = `steps:
  - name: step1
    with:
      tag: "#important"`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });

    it('should preserve leading spaces in values', () => {
      const input = `name:   !tag`;
      const expected = `name:   "!tag"`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });
  });

  describe('should NOT wrap characters that the YAML parser handles correctly', () => {
    it('should not wrap @ at the beginning of values', () => {
      const input = `user: @username`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should not wrap @ in the middle of values', () => {
      const input = `message: Hello @user how are you`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should not wrap email addresses', () => {
      const input = `email: user@example.com`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should not wrap $, %, ^, \\, <, ? at the beginning of values', () => {
      const testCases = [
        `value: $variable`,
        `value: %percentage`,
        `value: ^caret`,
        `value: \\backslash`,
        `value: <tag>`,
        `value: ?question`,
      ];

      testCases.forEach((input) => {
        expect(correctYamlSyntax(input)).toBe(input);
      });
    });

    it('should not modify unclosed quotes (YAML parser handles them)', () => {
      const input = `name: 'test workflow`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should not modify unclosed double quotes', () => {
      const input = `description: "This is a description`;
      expect(correctYamlSyntax(input)).toBe(input);
    });
  });

  describe('should not modify valid YAML constructs', () => {
    it('should not wrap already quoted values', () => {
      const input = `value1: "!important"
value2: '#hashtag'
value3: "&anchor"
value4: "*alias"`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should skip comment lines', () => {
      const input = `# This is a comment with !special &characters *here
name: test`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should not wrap valid multiline string indicators', () => {
      const input = `description: |
  This is a multiline
  string with !special &characters
  and *more content`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should not wrap valid folded scalar indicators', () => {
      const input = `description: >
  This is a folded
  scalar string`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should not wrap | with strip/keep indicators', () => {
      const testCases = [`value: |-`, `value: |+`, `value: >-`, `value: >+`];

      testCases.forEach((input) => {
        expect(correctYamlSyntax(input)).toBe(input);
      });
    });

    it('should handle empty YAML', () => {
      expect(correctYamlSyntax('')).toBe('');
    });

    it('should handle YAML with only comments', () => {
      const input = `# Comment 1
# Comment 2`;
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

    it('should not wrap special characters in the middle of values', () => {
      const input = `equation: 2 + 2 = 4`;
      expect(correctYamlSyntax(input)).toBe(input);
    });
  });

  describe('flow-style collections should pass through untouched', () => {
    it('should not wrap flow-style objects', () => {
      const testCases = [
        `value: {}`,
        `value: { }`,
        `value: { key: value }`,
        `value: {key: value}`,
        `value: { name: "test", id: 123 }`,
      ];

      testCases.forEach((input) => {
        expect(correctYamlSyntax(input)).toBe(input);
      });
    });

    it('should not wrap flow-style arrays', () => {
      const testCases = [
        `value: []`,
        `value: [ ]`,
        `value: [array]`,
        `value: [item1, item2]`,
        `value: [ "item1", "item2" ]`,
        `value: [incomplete`,
      ];

      testCases.forEach((input) => {
        expect(correctYamlSyntax(input)).toBe(input);
      });
    });

    it('should not wrap flow-style arrays containing special characters like @', () => {
      const testCases = [
        `items: [{"type": "foo", "@timestamp": "now"}, {"type": "bar", "@timestamp": "yesterday"}]`,
        `tags: ["@user1", "@user2"]`,
        `items: [{"key": "#value"}, {"key": "!important"}]`,
        `items: [{"@timestamp": "now"}`,
      ];

      testCases.forEach((input) => {
        expect(correctYamlSyntax(input)).toBe(input);
      });
    });

    it('should not wrap flow-style objects containing special characters', () => {
      const testCases = [
        `config: { "@timestamp": "now", type: "foo" }`,
        `meta: { tag: "#important", user: "@admin" }`,
      ];

      testCases.forEach((input) => {
        expect(correctYamlSyntax(input)).toBe(input);
      });
    });

    it('should not wrap multi-line JSON objects in YAML values', () => {
      const input = `steps:
  - name: generate_obs_alert
    type: ai.prompt
    with:
      schema: {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            }
          }
        }
      }
  - name: console
    type: console
    with:
      message: foo`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should not wrap multi-line JSON arrays in YAML values', () => {
      const input = `steps:
  - name: step1
    type: ai.prompt
    with:
      schema: [
        "item1",
        "item2",
        "item3"
      ]
  - name: step2
    type: console
    with:
      message: foo`;
      expect(correctYamlSyntax(input)).toBe(input);
    });
  });

  describe('full workflow scenarios', () => {
    it('should preserve full workflow with multi-line JSON schema (issue #15420)', () => {
      const input = `name: AI Steps Demo
enabled: false
description: This is a new workflow
triggers:
  - type: manual
steps:
  - name: generate_obs_alert
    type: ai.prompt
    connector-id: azure_open_ai
    with:
      prompt: |
        You are a system that generates Observability alerts.
        I need you to generate 2 alerts.
      schema: {
        "type": "array",
        "items": {
          "title": "ObservabilityAlert",
          "type": "object",
          "additionalProperties": false,
          "required": ["id", "severity", "message", "timestamp"],
          "properties": {
            "id": {
              "type": "string",
              "description": "Unique identifier of the alert",
              "examples": ["cpu_high_usage", "service_down"]
            },
            "severity": {
              "type": "string",
              "description": "Alert severity level",
              "enum": ["critical", "high", "medium", "low", "info"]
            }
          }
        }
      }
  - name: console
    type: console
    with:
      message: foo`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should preserve flow-style consts with @timestamp ', () => {
      const input = `name: New workflow
enabled: false
description: This is a new workflow
triggers:
  - type: manual

consts:
  items: [{"type": "foo", "@timestamp": "now"}, {"type": "bar", "@timestamp": "yesterday"}]

steps:
  - name: foreach
    type: foreach
    foreach: "{{consts.items}}"
    steps:
      - name: console
        type: console
        with:
          message: "{{foreach.item.type}}"`;
      expect(correctYamlSyntax(input)).toBe(input);
    });

    it('should wrap dangerous characters in a complex workflow', () => {
      const input = `workflow:
  steps:
    - type: action
      with:
        tag: #important
        ref: *alias
        anchor: &ref value
        bang: !tag
    - type: log
      with:
        message: "safe value"`;
      const expected = `workflow:
  steps:
    - type: action
      with:
        tag: "#important"
        ref: "*alias"
        anchor: "&ref value"
        bang: "!tag"
    - type: log
      with:
        message: "safe value"`;
      expect(correctYamlSyntax(input)).toBe(expected);
    });
  });
});
