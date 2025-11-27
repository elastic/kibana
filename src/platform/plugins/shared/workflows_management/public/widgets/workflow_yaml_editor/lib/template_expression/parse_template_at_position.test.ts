/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { parseTemplateAtPosition } from './parse_template_at_position';

describe('parseTemplateAtPosition', () => {
  // Helper to create a mock model
  function createMockModel(content: string): monaco.editor.ITextModel {
    return {
      getLineContent: (lineNumber: number) => {
        const lines = content.split('\n');
        return lines[lineNumber - 1] || '';
      },
    } as monaco.editor.ITextModel;
  }

  // Helper to create a position
  function createPosition(lineNumber: number, column: number): monaco.Position {
    return new monaco.Position(lineNumber, column);
  }

  describe('simple variable paths', () => {
    it('should parse simple variable path', () => {
      const model = createMockModel('message: "{{ inputs.userId }}"');
      const position = createPosition(1, 16); // cursor on "userId"

      const result = parseTemplateAtPosition(model, position);

      expect(result).toMatchObject({
        isInsideTemplate: true,
        variablePath: 'inputs.userId',
        pathSegments: ['inputs', 'userId'],
        filters: [],
        isOnFilter: false,
      });
    });

    it('should parse nested paths', () => {
      const model = createMockModel('value: "{{ steps.stepA.output.data }}"');
      const position = createPosition(1, 25); // cursor on "output"

      const result = parseTemplateAtPosition(model, position);

      expect(result).toMatchObject({
        isInsideTemplate: true,
        variablePath: 'steps.stepA.output.data',
        pathSegments: ['steps', 'stepA', 'output', 'data'],
        cursorSegmentIndex: 2, // "output" is at index 2
      });
    });

    it('should identify correct cursor segment', () => {
      const model = createMockModel('value: "{{ consts.indexName }}"');

      // Cursor on "consts"
      let result = parseTemplateAtPosition(model, createPosition(1, 13));
      expect(result?.cursorSegmentIndex).toBe(0);
      expect(result?.pathUpToCursor).toEqual(['consts']);

      // Cursor on "indexName"
      result = parseTemplateAtPosition(model, createPosition(1, 20));
      expect(result?.cursorSegmentIndex).toBe(1);
      expect(result?.pathUpToCursor).toEqual(['consts', 'indexName']);
    });
  });

  describe('expressions with filters', () => {
    it('should parse expression with single filter', () => {
      const model = createMockModel('value: "{{ inputs.name | upcase }}"');
      const position = createPosition(1, 16); // cursor on "name"

      const result = parseTemplateAtPosition(model, position);

      expect(result).toMatchObject({
        isInsideTemplate: true,
        expression: 'inputs.name | upcase',
        variablePath: 'inputs.name',
        pathSegments: ['inputs', 'name'],
        filters: ['upcase'],
        isOnFilter: false, // cursor is on variable path, not filter
      });
    });

    it('should parse expression with multiple filters', () => {
      const model = createMockModel('value: "{{ data | json | upcase }}"');
      const position = createPosition(1, 14); // cursor on "data"

      const result = parseTemplateAtPosition(model, position);

      expect(result).toMatchObject({
        variablePath: 'data',
        filters: ['json', 'upcase'],
        isOnFilter: false,
      });
    });

    it('should detect when cursor is on filter', () => {
      const model = createMockModel('value: "{{ inputs.name | upcase }}"');
      const position = createPosition(1, 26); // cursor on "upcase"

      const result = parseTemplateAtPosition(model, position);

      expect(result).toMatchObject({
        variablePath: 'inputs.name',
        filters: ['upcase'],
        isOnFilter: true, // cursor IS on filter
      });
    });

    it('should parse filter with arguments', () => {
      const model = createMockModel('value: "{{ count | plus: 10 }}"');
      const position = createPosition(1, 12); // cursor on "count"

      const result = parseTemplateAtPosition(model, position);

      expect(result).toMatchObject({
        variablePath: 'count',
        filters: ['plus'], // Arguments are stripped, just filter name
        isOnFilter: false,
      });
    });

    it('should handle json filter on complex paths', () => {
      const model = createMockModel('foreach: "{{ steps.search.output.hits.hits | json }}"');
      const position = createPosition(1, 30); // cursor on "output"

      const result = parseTemplateAtPosition(model, position);

      expect(result).toMatchObject({
        variablePath: 'steps.search.output.hits.hits',
        pathSegments: ['steps', 'search', 'output', 'hits', 'hits'],
        filters: ['json'],
        isOnFilter: false,
      });
    });
  });

  describe('foreach.item expressions', () => {
    it('should parse foreach.item path', () => {
      const model = createMockModel('message: "{{ foreach.item.name }}"');
      const position = createPosition(1, 22); // cursor on "item" (adjusted position)

      const result = parseTemplateAtPosition(model, position);

      expect(result).toMatchObject({
        isInsideTemplate: true,
        variablePath: 'foreach.item.name',
        pathSegments: ['foreach', 'item', 'name'],
        cursorSegmentIndex: 1, // "item" is at index 1
        pathUpToCursor: ['foreach', 'item'],
      });
    });

    it('should parse foreach.item._source.name', () => {
      const model = createMockModel('message: "{{ foreach.item._source.name }}"');
      const position = createPosition(1, 28); // cursor on "_source"

      const result = parseTemplateAtPosition(model, position);

      expect(result).toMatchObject({
        variablePath: 'foreach.item._source.name',
        pathSegments: ['foreach', 'item', '_source', 'name'],
        cursorSegmentIndex: 2, // "_source" is at index 2
        pathUpToCursor: ['foreach', 'item', '_source'],
      });
    });

    it('should parse foreach.index', () => {
      const model = createMockModel('index: "{{ foreach.index }}"');
      const position = createPosition(1, 18); // cursor on "index"

      const result = parseTemplateAtPosition(model, position);

      expect(result).toMatchObject({
        variablePath: 'foreach.index',
        pathSegments: ['foreach', 'index'],
      });
    });
  });

  describe('edge cases', () => {
    it('should return null when not inside template', () => {
      const model = createMockModel('message: "plain text"');
      const position = createPosition(1, 15);

      const result = parseTemplateAtPosition(model, position);

      expect(result).toBeNull();
    });

    it('should return null when cursor is outside template braces', () => {
      const model = createMockModel('message: "{{ inputs.name }}"');
      const position = createPosition(1, 5); // before {{

      const result = parseTemplateAtPosition(model, position);

      expect(result).toBeNull();
    });

    it('should handle templates with extra whitespace', () => {
      const model = createMockModel('value: "{{  inputs.name  |  upcase  }}"');
      const position = createPosition(1, 16); // cursor on "name"

      const result = parseTemplateAtPosition(model, position);

      expect(result).toMatchObject({
        variablePath: 'inputs.name',
        filters: ['upcase'],
      });
    });

    it('should handle bracket notation with numeric index', () => {
      const model = createMockModel('value: "{{ items[0].name }}"');
      const position = createPosition(1, 18); // cursor on "0"

      const result = parseTemplateAtPosition(model, position);

      expect(result).toMatchObject({
        isInsideTemplate: true,
        variablePath: 'items[0].name',
        pathSegments: ['items', '0', 'name'],
        cursorSegmentIndex: 1, // [0] is at index 1
      });
    });

    it('should handle bracket notation with string key', () => {
      const model = createMockModel('value: "{{ inputs.fields[\'exception.message\'] }}"');
      const position = createPosition(1, 33); // cursor inside ['exception.message']

      const result = parseTemplateAtPosition(model, position);

      expect(result).toMatchObject({
        isInsideTemplate: true,
        variablePath: "inputs.fields['exception.message']",
        pathSegments: ['inputs', 'fields', 'exception.message'],
      });
    });

    it('should handle hovering on property after bracket notation', () => {
      const model = createMockModel('message: "{{steps.formatMessage.output[0].result}}"');
      const position = createPosition(1, 45); // cursor on "result"

      const result = parseTemplateAtPosition(model, position);

      expect(result).toMatchObject({
        isInsideTemplate: true,
        variablePath: 'steps.formatMessage.output[0].result',
        pathSegments: ['steps', 'formatMessage', 'output', '0', 'result'],
        cursorSegmentIndex: 4, // "result" is at index 4
        pathUpToCursor: ['steps', 'formatMessage', 'output', '0', 'result'],
      });
    });
  });

  describe('template range and highlighting', () => {
    it('should calculate correct range for variable path without filters', () => {
      const model = createMockModel('value: "{{ consts.indexName }}"');
      const position = createPosition(1, 20); // cursor on "indexName"

      const result = parseTemplateAtPosition(model, position);

      expect(result?.templateRange).toBeDefined();
      // Should highlight "consts.indexName" (the full path up to cursor)
      expect(result?.isOnFilter).toBe(false);
    });

    it('should highlight entire expression when cursor is on filter', () => {
      const model = createMockModel('value: "{{ data | json }}"');
      const position = createPosition(1, 19); // cursor on "json"

      const result = parseTemplateAtPosition(model, position);

      expect(result?.templateRange).toBeDefined();
      expect(result?.isOnFilter).toBe(true);
      // Should highlight "data | json" (entire expression including filter)
    });
  });

  describe('complex real-world examples', () => {
    it('should parse complex foreach template', () => {
      const model = createMockModel(
        'foreach: "{{ steps.search_park_data.output.hits.hits | json }}"'
      );
      const position = createPosition(1, 50); // cursor on "hits" (second occurrence)

      const result = parseTemplateAtPosition(model, position);

      expect(result).toMatchObject({
        variablePath: 'steps.search_park_data.output.hits.hits',
        pathSegments: ['steps', 'search_park_data', 'output', 'hits', 'hits'],
        filters: ['json'],
        isOnFilter: false,
      });
    });

    it('should parse foreach item access in nested template', () => {
      const model = createMockModel('message: "{{ foreach.item._source.name | upcase }}"');
      const position = createPosition(1, 30); // cursor on "_source"

      const result = parseTemplateAtPosition(model, position);

      expect(result).toMatchObject({
        variablePath: 'foreach.item._source.name',
        pathSegments: ['foreach', 'item', '_source', 'name'],
        filters: ['upcase'],
        cursorSegmentIndex: 2,
        pathUpToCursor: ['foreach', 'item', '_source'],
        isOnFilter: false,
      });
    });

    it('should handle chained filters', () => {
      const model = createMockModel('value: "{{ name | strip | upcase | append: "!" }}"');
      const position = createPosition(1, 14); // cursor on "name"

      const result = parseTemplateAtPosition(model, position);

      expect(result).toMatchObject({
        variablePath: 'name',
        filters: ['strip', 'upcase', 'append'],
        isOnFilter: false,
      });
    });
  });
});
