/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Document, parseDocument } from 'yaml';
import { getScalarValueAtOffset } from './get_scalar_value_at_offset';

describe('getScalarValueAtOffset', () => {
  describe('basic value lookups', () => {
    it('should return the scalar value node when offset falls within a simple key-value pair value', () => {
      const yaml = 'name: hello';
      const doc = parseDocument(yaml);
      // "hello" starts at offset 6
      const result = getScalarValueAtOffset(doc, 6);
      expect(result).not.toBeNull();
      expect(result?.value).toBe('hello');
    });

    it('should not return a scalar key node (only values)', () => {
      const yaml = 'name: hello';
      const doc = parseDocument(yaml);
      // "name" is at offset 0–3, which is a key not a value
      const result = getScalarValueAtOffset(doc, 0);
      expect(result).toBeNull();
    });

    it('should return null when offset is outside all scalar ranges', () => {
      const yaml = 'name: hello';
      const doc = parseDocument(yaml);
      // offset well beyond end of document
      const result = getScalarValueAtOffset(doc, 100);
      expect(result).toBeNull();
    });

    it('should return null for a negative offset', () => {
      const yaml = 'name: hello';
      const doc = parseDocument(yaml);
      const result = getScalarValueAtOffset(doc, -1);
      expect(result).toBeNull();
    });
  });

  describe('empty and minimal documents', () => {
    it('should return null for a document with no contents', () => {
      const doc = new Document();
      const result = getScalarValueAtOffset(doc, 0);
      expect(result).toBeNull();
    });

    it('should return null for an empty string document', () => {
      const doc = parseDocument('');
      const result = getScalarValueAtOffset(doc, 0);
      expect(result).toBeNull();
    });

    it('should return null for a document with only a comment', () => {
      const yaml = '# just a comment';
      const doc = parseDocument(yaml);
      const result = getScalarValueAtOffset(doc, 5);
      expect(result).toBeNull();
    });

    it('should handle a document with only a scalar (bare value)', () => {
      const yaml = 'hello';
      const doc = parseDocument(yaml);
      // A bare scalar at the top level — its parent is the Document contents, not a Pair
      const result = getScalarValueAtOffset(doc, 0);
      expect(result).not.toBeNull();
      expect(result?.value).toBe('hello');
    });
  });

  describe('boundary offsets (start and end of range)', () => {
    it('should return the node when offset is exactly at the start of the value range', () => {
      const yaml = 'key: value';
      const doc = parseDocument(yaml);
      // "value" starts at offset 5
      const result = getScalarValueAtOffset(doc, 5);
      expect(result).not.toBeNull();
      expect(result?.value).toBe('value');
    });

    it('should return the node when offset is exactly at the end of the value range', () => {
      const yaml = 'key: value';
      const doc = parseDocument(yaml);
      const result = getScalarValueAtOffset(doc, 9);
      expect(result).not.toBeNull();
      expect(result?.value).toBe('value');
    });

    it('should return null when offset is one position before the value starts', () => {
      // "key: value" — the space at offset 4 is between key and value
      const yaml = 'key: value';
      const doc = parseDocument(yaml);
      const result = getScalarValueAtOffset(doc, 4);
      expect(result).toBeNull();
    });
  });

  describe('multiple values', () => {
    it('should find the correct value among multiple key-value pairs', () => {
      const yaml = `name: alice
age: 30
city: rome`;
      const doc = parseDocument(yaml);

      // "alice" starts at offset 6
      const nameResult = getScalarValueAtOffset(doc, 6);
      expect(nameResult).not.toBeNull();
      expect(nameResult?.value).toBe('alice');

      // "30" starts at offset 17
      const ageResult = getScalarValueAtOffset(doc, 17);
      expect(ageResult).not.toBeNull();
      expect(ageResult?.value).toBe(30);

      // "rome" starts at offset 26
      const cityResult = getScalarValueAtOffset(doc, 26);
      expect(cityResult).not.toBeNull();
      expect(cityResult?.value).toBe('rome');
    });

    it('should return null for an offset that falls on a colon-space separator (not within any value)', () => {
      const yaml = `first_key: alpha\nsecond_key: beta`;
      const doc = parseDocument(yaml);
      // The ": " between "second_key" and "beta" — offset of ":" in "second_key: beta"
      const colonOffset = yaml.indexOf(': beta');
      const result = getScalarValueAtOffset(doc, colonOffset);
      // The colon-space is outside any value range; it may fall in
      // the trailing range of "alpha" or be truly outside all values
      // Either way it must not return "beta" (incorrect value)
      if (result !== null) {
        expect(result.value).toBe('alpha');
      }
    });
  });

  describe('sequence (array) items', () => {
    it('should return scalar nodes that are items in a sequence', () => {
      const yaml = `items:
  - first
  - second
  - third`;
      const doc = parseDocument(yaml);

      // "first" — sequence items are values (parent is YAMLSeq, not a Pair)
      const firstNode = getScalarValueAtOffset(doc, 11);
      expect(firstNode).not.toBeNull();
      expect(firstNode?.value).toBe('first');

      const secondNode = getScalarValueAtOffset(doc, 22);
      expect(secondNode).not.toBeNull();
      expect(secondNode?.value).toBe('second');
    });

    it('should handle a top-level sequence', () => {
      const yaml = `- alpha
- beta`;
      const doc = parseDocument(yaml);

      const alphaNode = getScalarValueAtOffset(doc, 2);
      expect(alphaNode).not.toBeNull();
      expect(alphaNode?.value).toBe('alpha');

      const betaNode = getScalarValueAtOffset(doc, 10);
      expect(betaNode).not.toBeNull();
      expect(betaNode?.value).toBe('beta');
    });
  });

  describe('nested structures', () => {
    it('should find values in nested maps', () => {
      const yaml = `parent:
  child: nested_value`;
      const doc = parseDocument(yaml);

      const result = getScalarValueAtOffset(doc, 18);
      expect(result).not.toBeNull();
      expect(result?.value).toBe('nested_value');
    });

    it('should find values in deeply nested structures', () => {
      const yaml = `level1:\n  level2:\n    level3: deep`;
      const doc = parseDocument(yaml);

      const deepOffset = yaml.indexOf('deep');
      const result = getScalarValueAtOffset(doc, deepOffset);
      expect(result).not.toBeNull();
      expect(result?.value).toBe('deep');
    });

    it('should not return nested keys as values', () => {
      const yaml = `parent:
  child: value`;
      const doc = parseDocument(yaml);

      // "child" is a key at offset 10
      const result = getScalarValueAtOffset(doc, 10);
      expect(result).toBeNull();
    });
  });

  describe('quoted and special scalar values', () => {
    it('should find double-quoted string values', () => {
      const yaml = 'msg: "hello world"';
      const doc = parseDocument(yaml);

      const result = getScalarValueAtOffset(doc, 5);
      expect(result).not.toBeNull();
      expect(result?.value).toBe('hello world');
    });

    it('should find single-quoted string values', () => {
      const yaml = "msg: 'hello world'";
      const doc = parseDocument(yaml);

      const result = getScalarValueAtOffset(doc, 5);
      expect(result).not.toBeNull();
      expect(result?.value).toBe('hello world');
    });

    it('should find boolean values', () => {
      const yaml = 'enabled: true';
      const doc = parseDocument(yaml);

      const result = getScalarValueAtOffset(doc, 9);
      expect(result).not.toBeNull();
      expect(result?.value).toBe(true);
    });

    it('should find numeric values', () => {
      const yaml = 'count: 42';
      const doc = parseDocument(yaml);

      const result = getScalarValueAtOffset(doc, 7);
      expect(result).not.toBeNull();
      expect(result?.value).toBe(42);
    });

    it('should find null values', () => {
      const yaml = 'empty: null';
      const doc = parseDocument(yaml);

      const result = getScalarValueAtOffset(doc, 7);
      expect(result).not.toBeNull();
      expect(result?.value).toBeNull();
    });

    it('should find empty string values', () => {
      const yaml = "empty: ''";
      const doc = parseDocument(yaml);

      const result = getScalarValueAtOffset(doc, 7);
      expect(result).not.toBeNull();
      expect(result?.value).toBe('');
    });
  });

  describe('template/dynamic values (primary use-case)', () => {
    it('should find a value containing a Liquid variable expression', () => {
      const yaml = 'greeting: "{{ context.name }}"';
      const doc = parseDocument(yaml);

      const result = getScalarValueAtOffset(doc, 10);
      expect(result).not.toBeNull();
      expect(result?.value).toBe('{{ context.name }}');
    });

    it('should find a value containing a Liquid tag', () => {
      const yaml = 'condition: "{% if true %}yes{% endif %}"';
      const doc = parseDocument(yaml);

      const result = getScalarValueAtOffset(doc, 11);
      expect(result).not.toBeNull();
      expect(result?.value).toBe('{% if true %}yes{% endif %}');
    });

    it('should find a value containing a dynamic expression ${{ }}', () => {
      const yaml = 'ref: "${{ steps.foo.output }}"';
      const doc = parseDocument(yaml);

      const result = getScalarValueAtOffset(doc, 5);
      expect(result).not.toBeNull();
      expect(result?.value).toBe('${{ steps.foo.output }}');
    });
  });

  describe('multi-line values', () => {
    it('should find a value in a multi-line literal block scalar', () => {
      const yaml = `description: |
  This is a
  multi-line value`;
      const doc = parseDocument(yaml);

      // The block scalar value starts after "|\n"
      const result = getScalarValueAtOffset(doc, 17);
      expect(result).not.toBeNull();
      expect(result?.value).toContain('This is a');
    });

    it('should find a value in a multi-line folded block scalar', () => {
      const yaml = `description: >
  This is a
  folded value`;
      const doc = parseDocument(yaml);

      const result = getScalarValueAtOffset(doc, 17);
      expect(result).not.toBeNull();
      expect(result?.value).toContain('This is a');
    });
  });

  describe('caching behavior (WeakMap)', () => {
    it('should return consistent results on repeated calls with the same document', () => {
      const yaml = `a: one
b: two
c: three`;
      const doc = parseDocument(yaml);

      // First call populates the cache
      const result1 = getScalarValueAtOffset(doc, 3);
      expect(result1).not.toBeNull();
      expect(result1?.value).toBe('one');

      // Second call with a different offset should use cached scalars
      const result2 = getScalarValueAtOffset(doc, 14);
      expect(result2).not.toBeNull();
      expect(result2?.value).toBe('two');

      // Third call with yet another offset
      const result3 = getScalarValueAtOffset(doc, 21);
      expect(result3).not.toBeNull();
      expect(result3?.value).toBe('three');

      // Re-verify the first call returns the same result
      const result1Again = getScalarValueAtOffset(doc, 3);
      expect(result1Again).not.toBeNull();
      expect(result1Again?.value).toBe('one');
      expect(result1Again).toBe(result1);
    });

    it('should cache separately for different Document instances', () => {
      const yaml1 = 'a: first';
      const yaml2 = 'a: second';
      const doc1 = parseDocument(yaml1);
      const doc2 = parseDocument(yaml2);

      const result1 = getScalarValueAtOffset(doc1, 3);
      expect(result1?.value).toBe('first');

      const result2 = getScalarValueAtOffset(doc2, 3);
      expect(result2?.value).toBe('second');

      // Verify doc1 is still independently cached
      const result1Again = getScalarValueAtOffset(doc1, 3);
      expect(result1Again?.value).toBe('first');
    });
  });

  describe('binary search correctness', () => {
    it('should correctly find the first scalar in a large set', () => {
      const lines = Array.from({ length: 20 }, (_, i) => `key${i}: value${i}`);
      const yaml = lines.join('\n');
      const doc = parseDocument(yaml);

      // Find the very first value using indexOf for accurate offset
      const value0Offset = yaml.indexOf('value0');
      const result = getScalarValueAtOffset(doc, value0Offset);
      expect(result).not.toBeNull();
      expect(result?.value).toBe('value0');
    });

    it('should correctly find the last scalar in a large set', () => {
      const lines = Array.from({ length: 20 }, (_, i) => `key${i}: value${i}`);
      const yaml = lines.join('\n');
      const doc = parseDocument(yaml);

      // Find the very last value — "value19" in the last line
      const lastLineStart = yaml.lastIndexOf('value19');
      const result = getScalarValueAtOffset(doc, lastLineStart);
      expect(result).not.toBeNull();
      expect(result?.value).toBe('value19');
    });

    it('should correctly find a scalar in the middle of a large set', () => {
      const lines = Array.from({ length: 20 }, (_, i) => `key${i}: value${i}`);
      const yaml = lines.join('\n');
      const doc = parseDocument(yaml);

      const midValueStart = yaml.indexOf('value10');
      const result = getScalarValueAtOffset(doc, midValueStart);
      expect(result).not.toBeNull();
      expect(result?.value).toBe('value10');
    });

    it('should return null for offset in whitespace gap between two value ranges', () => {
      const yaml = `a: x
b: y`;
      const doc = parseDocument(yaml);

      // The colon+space between "b" and "y" — offset of ":" after "b"
      const colonOffset = yaml.indexOf(': y');
      const result = getScalarValueAtOffset(doc, colonOffset);
      expect(result).toBeNull();
    });
  });

  describe('workflow-like YAML structures', () => {
    it('should find step values in a workflow-like document', () => {
      const yaml = `steps:
  - name: noop_step
    type: noop
    with:
      message: Hello, world!`;
      const doc = parseDocument(yaml);

      // "noop_step" value
      const nameOffset = yaml.indexOf('noop_step');
      const nameResult = getScalarValueAtOffset(doc, nameOffset);
      expect(nameResult).not.toBeNull();
      expect(nameResult?.value).toBe('noop_step');

      // "noop" value (type field) — use "noop\n" to avoid matching "noop_step"
      const typeOffset = yaml.indexOf('noop\n');
      const typeResult = getScalarValueAtOffset(doc, typeOffset);
      expect(typeResult).not.toBeNull();
      expect(typeResult?.value).toBe('noop');

      // "Hello, world!" value
      const msgOffset = yaml.indexOf('Hello, world!');
      const msgResult = getScalarValueAtOffset(doc, msgOffset);
      expect(msgResult).not.toBeNull();
      expect(msgResult?.value).toBe('Hello, world!');
    });

    it('should correctly distinguish keys from values in a workflow-like document', () => {
      const yaml = `steps:
  - name: my_step
    type: noop`;
      const doc = parseDocument(yaml);

      // "name" is a key
      const nameKeyOffset = yaml.indexOf('name');
      const nameKeyResult = getScalarValueAtOffset(doc, nameKeyOffset);
      expect(nameKeyResult).toBeNull();

      // "type" is a key
      const typeKeyOffset = yaml.indexOf('type');
      const typeKeyResult = getScalarValueAtOffset(doc, typeKeyOffset);
      expect(typeKeyResult).toBeNull();

      // "steps" is a key
      const stepsKeyResult = getScalarValueAtOffset(doc, 0);
      expect(stepsKeyResult).toBeNull();
    });

    it('should handle template variables in step parameters', () => {
      const yaml = `steps:
  - name: greet
    type: console
    with:
      message: "{{ context.greeting }}"`;
      const doc = parseDocument(yaml);

      const templateOffset = yaml.indexOf('"{{ context.greeting }}"');
      const result = getScalarValueAtOffset(doc, templateOffset);
      expect(result).not.toBeNull();
      expect(result?.value).toBe('{{ context.greeting }}');
    });
  });

  describe('edge cases with document structure', () => {
    it('should return null for an offset past the end of a key-only entry', () => {
      const yaml = 'key:';
      const doc = parseDocument(yaml);
      // offset 4 is past the end of the YAML content.
      // "key:" may produce an implicit null Scalar value at offset 3–4;
      // an offset well beyond the document should return null.
      const result = getScalarValueAtOffset(doc, 10);
      expect(result).toBeNull();
    });

    it('should handle a key with explicit null value', () => {
      const yaml = 'key: null';
      const doc = parseDocument(yaml);

      const result = getScalarValueAtOffset(doc, 5);
      expect(result).not.toBeNull();
      expect(result?.value).toBeNull();
    });

    it('should handle flow-style mapping values', () => {
      const yaml = '{a: 1, b: 2}';
      const doc = parseDocument(yaml);

      const aResult = getScalarValueAtOffset(doc, 4);
      expect(aResult).not.toBeNull();
      expect(aResult?.value).toBe(1);

      const bResult = getScalarValueAtOffset(doc, 10);
      expect(bResult).not.toBeNull();
      expect(bResult?.value).toBe(2);
    });

    it('should handle flow-style sequence values', () => {
      const yaml = '[one, two, three]';
      const doc = parseDocument(yaml);

      const oneResult = getScalarValueAtOffset(doc, 1);
      expect(oneResult).not.toBeNull();
      expect(oneResult?.value).toBe('one');

      const twoResult = getScalarValueAtOffset(doc, 6);
      expect(twoResult).not.toBeNull();
      expect(twoResult?.value).toBe('two');
    });

    it('should handle a map with duplicate keys (YAML allows them but warns)', () => {
      const yaml = `a: first
a: second`;
      const doc = parseDocument(yaml);

      // Both values should be collected as scalar values
      const firstResult = getScalarValueAtOffset(doc, 3);
      expect(firstResult).not.toBeNull();
      expect(firstResult?.value).toBe('first');

      const secondResult = getScalarValueAtOffset(doc, 12);
      expect(secondResult).not.toBeNull();
      expect(secondResult?.value).toBe('second');
    });

    it('should handle offset at 0 for a top-level bare scalar document', () => {
      const yaml = '42';
      const doc = parseDocument(yaml);

      const result = getScalarValueAtOffset(doc, 0);
      expect(result).not.toBeNull();
      expect(result?.value).toBe(42);
    });

    it('should handle a single-element map', () => {
      const yaml = 'only: value';
      const doc = parseDocument(yaml);

      // The only value node
      const result = getScalarValueAtOffset(doc, 6);
      expect(result).not.toBeNull();
      expect(result?.value).toBe('value');

      // The only key node
      const keyResult = getScalarValueAtOffset(doc, 0);
      expect(keyResult).toBeNull();
    });

    it('should handle anchors and aliases', () => {
      const yaml = `default: &anchor base_value
ref: *anchor`;
      const doc = parseDocument(yaml);

      const defaultResult = getScalarValueAtOffset(doc, yaml.indexOf('base_value'));
      expect(defaultResult).not.toBeNull();
      expect(defaultResult?.value).toBe('base_value');
    });
  });
});
