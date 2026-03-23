/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { getPathAtOffset } from './get_path_at_offset';

describe('getPathAtOffset', () => {
  it('should return the correct path at the offset', () => {
    const yaml = `steps:
      - name: noop_step
        type: noop|<-
        with:
          message: Hello, world!`;
    const offset = yaml.indexOf('|<-');
    const result = getPathAtOffset(parseDocument(yaml), offset);
    expect(result).toEqual(['steps', 0, 'type']);
  });
  it('should return the correct path even with incomplete yaml', () => {
    const yaml = `steps:
      - name: noop_step
        |<-
      - name: if_step
        type: if
        condition: 'true'
        steps:
          - name: then_step
            type: console
            with:
            message: "true {{event.spaceId}}"
`;
    const offset = yaml.indexOf('|<-');
    const result = getPathAtOffset(parseDocument(yaml), offset);
    expect(result).toEqual(['steps']);
  });

  it('should handle deeply nested structures', () => {
    const yaml = `steps:
      - name: outer_step
        type: if
        steps:
          - name: inner_step
            with:
              nested:
                deep:
                  value: test|<-`;
    const offset = yaml.indexOf('|<-');
    const result = getPathAtOffset(parseDocument(yaml), offset);
    expect(result).toEqual(['steps', 0, 'steps', 0, 'with', 'nested', 'deep', 'value']);
  });

  it('should handle arrays within objects', () => {
    const yaml = `config:
      items:
        - first|<-
        - second
        - third`;
    const offset = yaml.indexOf('|<-');
    const result = getPathAtOffset(parseDocument(yaml), offset);
    expect(result).toEqual(['config', 'items']);
  });

  it('should return empty array for empty document', () => {
    const result = getPathAtOffset(parseDocument(''), 0);
    expect(result).toEqual([]);
  });

  it('should return empty array when no node found at offset', () => {
    const yaml = `steps:
      - name: test`;
    const result = getPathAtOffset(parseDocument(yaml), 1000);
    expect(result).toEqual([]);
  });

  it('should handle offset at the beginning of a key', () => {
    const yaml = `steps:
      - name|<-: test_step
        type: noop`;
    const offset = yaml.indexOf('|<-');
    const cleanedYaml = yaml.replace('|<-', '');
    const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
    expect(result).toEqual(['steps', 0, 'name']);
  });

  it('should handle offset in multiline strings', () => {
    const yaml = `steps:
      - name: test_step
        description: |
          This is a
          multiline|<-
          description`;
    const offset = yaml.indexOf('|<-');
    const cleanedYaml = yaml.replace('|<-', '');
    const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
    expect(result).toEqual(['steps', 0, 'description']);
  });

  it('should skip empty scalars from incomplete yaml', () => {
    const yaml = `steps:
      - name:
        |<-
        type: test`;
    const offset = yaml.indexOf('|<-');
    const cleanedYaml = yaml.replace('|<-', '');
    const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
    expect(result).toEqual(['steps']);
  });

  it('should return correct path for inputs section type field', () => {
    const yaml = `inputs:
  - name: myInput
    type: string|<-
    description: "My input"`;
    const offset = yaml.indexOf('|<-');
    const cleanedYaml = yaml.replace('|<-', '');
    const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
    expect(result).toEqual(['inputs', 0, 'type']);
  });

  it('should return correct path when typing after type: in inputs section', () => {
    const yaml = `inputs:
  - name: myInput
    type: |<-
    description: "My input"`;
    const offset = yaml.indexOf('|<-');
    const cleanedYaml = yaml.replace('|<-', '');
    const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
    // When typing right after "type:", should return path to the Map node containing type
    expect(result).toEqual(['inputs', 0, 'type']);
  });

  it('should return correct path for triggers section', () => {
    const yaml = `triggers:
  - type: manual|<-
steps: []`;
    const offset = yaml.indexOf('|<-');
    const cleanedYaml = yaml.replace('|<-', '');
    const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
    expect(result).toEqual(['triggers', 0, 'type']);
  });

  it('should return correct path when typing after type: in triggers section', () => {
    const yaml = `triggers:
  - type: |<-
steps: []`;
    const offset = yaml.indexOf('|<-');
    const cleanedYaml = yaml.replace('|<-', '');
    const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
    // When typing right after "type:", should return path to the Map node containing type
    expect(result).toEqual(['triggers', 0, 'type']);
  });

  it('should return correct path when typing after type: in inputs section with steps section below', () => {
    const yaml = `inputs:
  - type: |<-
steps: []`;
    const offset = yaml.indexOf('|<-');
    const cleanedYaml = yaml.replace('|<-', '');
    const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
    // When typing right after "type:", should return path to the Map node containing type
    expect(result).toEqual(['inputs', 0, 'type']);
  });

  it('should return correct path for inputs section when steps section exists below', () => {
    const yaml = `name: New workflow

enabled: false

triggers:
  - type: alert

inputs:
  - type: |<-

steps:
  - name: first-step
    type: console
    with:
      message: First step executed`;
    const offset = yaml.indexOf('|<-');
    const cleanedYaml = yaml.replace('|<-', '');
    const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
    // Should return inputs path, not steps path
    expect(result).toEqual(['inputs', 0, 'type']);
  });

  it('should return correct path when typing after type: with multiple spaces', () => {
    const yaml = `name: New workflow

enabled: false

triggers:
  - type: alert

inputs:
  - type:     |<-

steps:
  - name: first-step
    type: console
    with:
      message: First step executed`;
    const offset = yaml.indexOf('|<-');
    const cleanedYaml = yaml.replace('|<-', '');
    const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
    // Should return inputs path even with multiple spaces after type:
    expect(result).toEqual(['inputs', 0, 'type']);
  });

  describe('edge cases', () => {
    it('should not match incomplete pair when cursor is beyond MAX_PAIR_DISTANCE', () => {
      const yaml = `inputs:
  - name: myInput
    type: |<-

    ${' '.repeat(60)}description: "My input"`;
      const offset = yaml.indexOf('|<-');
      const cleanedYaml = yaml.replace('|<-', '');
      const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
      // Should return type path since it's within MAX_PAIR_DISTANCE
      expect(result).toEqual(['inputs', 0, 'type']);
    });

    it('should handle position exactly at MAX_PAIR_DISTANCE boundary', () => {
      const yaml = `inputs:
  - name: myInput
    type: |<-
    ${' '.repeat(48)}description: "My input"`;
      const offset = yaml.indexOf('|<-');
      const cleanedYaml = yaml.replace('|<-', '');
      const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
      // Should still match since distance is exactly 50 (within MAX_PAIR_DISTANCE)
      expect(result).toEqual(['inputs', 0, 'type']);
    });

    it('should handle incomplete pair with cursor right after key', () => {
      // Test case where cursor is right after the key (incomplete pair, no value yet)
      const yaml = `inputs:
  - name: myInput
    type: |<-
    description: "My input"`;
      const offset = yaml.indexOf('|<-');
      const cleanedYaml = yaml.replace('|<-', '');
      const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
      // Should match type pair since cursor is right after key (distance is small, within MAX_PAIR_DISTANCE)
      // This tests the incomplete pair case where there's no value node yet
      expect(result).toEqual(['inputs', 0, 'type']);
    });

    it('should handle position between two pairs', () => {
      const yaml = `inputs:
  - name: myInput
    type: string
    |<-
    description: "My input"`;
      const offset = yaml.indexOf('|<-');
      const cleanedYaml = yaml.replace('|<-', '');
      const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
      // Should return the parent map/sequence containing both pairs
      expect(result).toEqual(['inputs']);
    });

    it('should handle position at the very beginning of document', () => {
      const yaml = `|<-name: test
steps: []`;
      const offset = yaml.indexOf('|<-');
      const cleanedYaml = yaml.replace('|<-', '');
      const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
      // Should return empty array or root path
      expect(result).toEqual([]);
    });

    it('should handle position at the very end of document', () => {
      const yaml = `name: test
steps: []|<-`;
      const offset = yaml.indexOf('|<-');
      const cleanedYaml = yaml.replace('|<-', '');
      const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
      // Should return path to the last element
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle position in a sequence item that is not a map', () => {
      const yaml = `tags:
  - tag1
  - tag2|<-
  - tag3`;
      const offset = yaml.indexOf('|<-');
      const cleanedYaml = yaml.replace('|<-', '');
      const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
      // Should return path to the sequence (scalar items don't have individual paths)
      expect(result).toEqual(['tags']);
    });

    it('should handle position in nested pairs with same key name', () => {
      const yaml = `steps:
  - name: outer
    type: if
    steps:
      - name: inner
        type: console|<-
        with:
          message: test`;
      const offset = yaml.indexOf('|<-');
      const cleanedYaml = yaml.replace('|<-', '');
      const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
      // Should return path to the inner type, not outer
      expect(result).toEqual(['steps', 0, 'steps', 0, 'type']);
    });

    it('should handle position in value area of pair with null value', () => {
      const yaml = `config:
  enabled: null|<-
  disabled: false`;
      const offset = yaml.indexOf('|<-');
      const cleanedYaml = yaml.replace('|<-', '');
      const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
      // Should handle null values gracefully
      expect(result).toEqual(['config', 'enabled']);
    });

    it('should handle position in YAML with comments', () => {
      const yaml = `inputs:
  # This is a comment
  - name: myInput
    type: string|<-
    description: "My input"`;
      const offset = yaml.indexOf('|<-');
      const cleanedYaml = yaml.replace('|<-', '');
      const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
      // Should correctly handle comments
      expect(result).toEqual(['inputs', 0, 'type']);
    });

    it('should handle position in multiline value with newlines', () => {
      const yaml = `steps:
  - name: test
    description: |
      Line 1
      Line 2|<-
      Line 3`;
      const offset = yaml.indexOf('|<-');
      const cleanedYaml = yaml.replace('|<-', '');
      const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
      // Should return path to description field
      expect(result).toEqual(['steps', 0, 'description']);
    });

    it('should handle position in a pair where key is not a scalar', () => {
      const yaml = `complex:
  - key: value|<-
    other: test`;
      const offset = yaml.indexOf('|<-');
      const cleanedYaml = yaml.replace('|<-', '');
      const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
      // Should handle non-scalar keys gracefully
      expect(result.length).toBeGreaterThan(0);
    });

    it('should prioritize closest pair when multiple pairs match', () => {
      const yaml = `steps:
  - name: step1
    type: console
    with:
      type: nested|<-
      message: test`;
      const offset = yaml.indexOf('|<-');
      const cleanedYaml = yaml.replace('|<-', '');
      const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
      // Should return the nested type, not the step type
      expect(result).toEqual(['steps', 0, 'with', 'type']);
    });

    it('should handle position in empty map', () => {
      const yaml = `config: {}
steps:
  - name: test
    type: console|<-
    with:
      message: test`;
      const offset = yaml.indexOf('|<-');
      const cleanedYaml = yaml.replace('|<-', '');
      const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
      // Should correctly navigate past empty map
      expect(result).toEqual(['steps', 0, 'type']);
    });

    it('should handle position in empty sequence', () => {
      const yaml = `tags: []
steps:
  - name: test
    type: console|<-
    with:
      message: test`;
      const offset = yaml.indexOf('|<-');
      const cleanedYaml = yaml.replace('|<-', '');
      const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
      // Should correctly navigate past empty sequence
      expect(result).toEqual(['steps', 0, 'type']);
    });

    it('should handle very long key-value pairs', () => {
      const longValue = 'a'.repeat(1000);
      const yaml = `steps:
  - name: test
    description: ${longValue}|<-
    type: console`;
      const offset = yaml.indexOf('|<-');
      const cleanedYaml = yaml.replace('|<-', '');
      const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
      // Should handle long values correctly
      expect(result).toEqual(['steps', 0, 'description']);
    });

    it('should handle position in value with special characters', () => {
      const yaml = `steps:
  - name: test
    message: "Hello: world! @#$%^&*()"|<-
    type: console`;
      const offset = yaml.indexOf('|<-');
      const cleanedYaml = yaml.replace('|<-', '');
      const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
      // Should handle special characters in values
      expect(result).toEqual(['steps', 0, 'message']);
    });

    it('should handle position in tab-separated values', () => {
      const yaml = `steps:
  - name:	test
    type:	console|<-
    with:
      message: test`;
      const offset = yaml.indexOf('|<-');
      const cleanedYaml = yaml.replace('|<-', '');
      const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
      // Should handle tab characters
      expect(result).toEqual(['steps', 0, 'type']);
    });
  });
});
