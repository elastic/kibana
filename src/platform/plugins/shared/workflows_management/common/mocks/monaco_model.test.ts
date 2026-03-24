/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco/src/monaco_imports';
import { createFakeMonacoModel } from './monaco_model';

describe('createMockModel', () => {
  it('should create a mock model', () => {
    const model = createFakeMonacoModel('name: one_step_workflow');
    expect(model.getLineCount()).toBe(1);
  });

  it('should calculate offset from position', () => {
    const model = createFakeMonacoModel(`name: one_step_workflow
steps:
  - name: get_google
    type: http
    with:
      url: https://google.com`);
    expect(model.getOffsetAt(new monaco.Position(1, 1))).toBe(0);
    expect(model.getOffsetAt(new monaco.Position(1, 2))).toBe(1);
    expect(model.getOffsetAt(new monaco.Position(2, 1))).toBe(24);
  });

  describe('getWordAtPosition', () => {
    it('should return the word at cursor position', () => {
      const model = createFakeMonacoModel('hello world test');

      // Test word "hello"
      const result1 = model.getWordAtPosition({ lineNumber: 1, column: 3 });
      expect(result1).toEqual({
        word: 'hello',
        startColumn: 1,
        endColumn: 6,
      });

      // Test word "world"
      const result2 = model.getWordAtPosition({ lineNumber: 1, column: 8 });
      expect(result2).toEqual({
        word: 'world',
        startColumn: 7,
        endColumn: 12,
      });

      // Test word "test"
      const result3 = model.getWordAtPosition({ lineNumber: 1, column: 15 });
      expect(result3).toEqual({
        word: 'test',
        startColumn: 13,
        endColumn: 17,
      });
    });

    it('should return null when cursor is not on a word', () => {
      const model = createFakeMonacoModel('hello  world');

      // Between words (on space) - column 7 is on the space
      const result1 = model.getWordAtPosition({ lineNumber: 1, column: 7 });
      expect(result1).toBeNull();

      // After all text
      const result2 = model.getWordAtPosition({ lineNumber: 1, column: 14 });
      expect(result2).toBeNull();
    });

    it('should handle numbers and decimals', () => {
      const model = createFakeMonacoModel('value: 123.456 -789.0');

      const result1 = model.getWordAtPosition({ lineNumber: 1, column: 10 });
      expect(result1).toEqual({
        word: '123.456',
        startColumn: 8,
        endColumn: 15,
      });

      const result2 = model.getWordAtPosition({ lineNumber: 1, column: 18 });
      expect(result2).toEqual({
        word: '-789.0',
        startColumn: 16,
        endColumn: 22,
      });
    });

    it('should handle special characters as word boundaries', () => {
      const model = createFakeMonacoModel('object.property[index]');

      const result1 = model.getWordAtPosition({ lineNumber: 1, column: 3 });
      expect(result1).toEqual({
        word: 'object',
        startColumn: 1,
        endColumn: 7,
      });

      const result2 = model.getWordAtPosition({ lineNumber: 1, column: 10 });
      expect(result2).toEqual({
        word: 'property',
        startColumn: 8,
        endColumn: 16,
      });

      const result3 = model.getWordAtPosition({ lineNumber: 1, column: 19 });
      expect(result3).toEqual({
        word: 'index',
        startColumn: 17,
        endColumn: 22,
      });
    });

    it('should handle empty lines', () => {
      const model = createFakeMonacoModel('');
      const result = model.getWordAtPosition({ lineNumber: 1, column: 1 });
      expect(result).toBeNull();
    });

    it('should handle out of bounds line numbers', () => {
      const model = createFakeMonacoModel('hello');
      const result = model.getWordAtPosition({ lineNumber: 2, column: 1 });
      expect(result).toBeNull();
    });
  });

  describe('getWordUntilPosition', () => {
    it('should return partial word up to cursor position', () => {
      const model = createFakeMonacoModel('hello world');

      // Cursor in middle of "hello"
      const result1 = model.getWordUntilPosition({ lineNumber: 1, column: 3 });
      expect(result1).toEqual({
        word: 'he',
        startColumn: 1,
        endColumn: 3,
      });

      // Cursor at end of "hello"
      const result2 = model.getWordUntilPosition({ lineNumber: 1, column: 6 });
      expect(result2).toEqual({
        word: 'hello',
        startColumn: 1,
        endColumn: 6,
      });

      // Cursor in middle of "world"
      const result3 = model.getWordUntilPosition({ lineNumber: 1, column: 9 });
      expect(result3).toEqual({
        word: 'wo',
        startColumn: 7,
        endColumn: 9,
      });
    });

    it('should return empty word when cursor is not on a word', () => {
      const model = createFakeMonacoModel('hello world');

      // On space between words
      const result = model.getWordUntilPosition({ lineNumber: 1, column: 6 });
      expect(result).toEqual({
        word: 'hello',
        startColumn: 1,
        endColumn: 6,
      });
    });

    it('should handle cursor at beginning of word', () => {
      const model = createFakeMonacoModel('hello world');

      const result = model.getWordUntilPosition({ lineNumber: 1, column: 1 });
      expect(result).toEqual({
        word: '',
        startColumn: 1,
        endColumn: 1,
      });
    });

    it('should handle special characters and numbers', () => {
      const model = createFakeMonacoModel('var123 = 456.789');

      const result1 = model.getWordUntilPosition({ lineNumber: 1, column: 5 });
      expect(result1).toEqual({
        word: 'var1',
        startColumn: 1,
        endColumn: 5,
      });

      const result2 = model.getWordUntilPosition({ lineNumber: 1, column: 13 });
      expect(result2).toEqual({
        word: '456',
        startColumn: 10,
        endColumn: 13,
      });
    });

    it('should handle empty lines', () => {
      const model = createFakeMonacoModel('');
      const result = model.getWordUntilPosition({ lineNumber: 1, column: 1 });
      expect(result).toEqual({
        word: '',
        startColumn: 1,
        endColumn: 1,
      });
    });

    it('should handle out of bounds line numbers', () => {
      const model = createFakeMonacoModel('hello');
      const result = model.getWordUntilPosition({ lineNumber: 2, column: 1 });
      expect(result).toEqual({
        word: '',
        startColumn: 1,
        endColumn: 1,
      });
    });
  });

  describe('getValue', () => {
    it('should return the full text content', () => {
      const content = `name: test
steps:
  - action: log`;
      const model = createFakeMonacoModel(content);
      expect(model.getValue()).toBe(content);
    });
  });

  describe('getPositionAt', () => {
    it('should convert offset to position correctly', () => {
      const model = createFakeMonacoModel(`line1
line2
line3`);

      // Start of first line
      expect(model.getPositionAt(0)).toEqual({ lineNumber: 1, column: 1 });

      // End of first line
      expect(model.getPositionAt(5)).toEqual({ lineNumber: 1, column: 6 });

      // Start of second line
      expect(model.getPositionAt(6)).toEqual({ lineNumber: 2, column: 1 });

      // Middle of second line
      expect(model.getPositionAt(8)).toEqual({ lineNumber: 2, column: 3 });

      // Start of third line
      expect(model.getPositionAt(12)).toEqual({ lineNumber: 3, column: 1 });
    });

    it('should handle offset beyond text length', () => {
      const model = createFakeMonacoModel('short');
      const result = model.getPositionAt(100);
      expect(result).toEqual({ lineNumber: 1, column: 6 });
    });
  });

  describe('getLineContent', () => {
    it('should return content of specific lines', () => {
      const model = createFakeMonacoModel(`first line
second line
third line`);

      expect(model.getLineContent(1)).toBe('first line');
      expect(model.getLineContent(2)).toBe('second line');
      expect(model.getLineContent(3)).toBe('third line');
    });

    it('should return empty string for out of bounds line numbers', () => {
      const model = createFakeMonacoModel('single line');
      expect(model.getLineContent(0)).toBe('');
      expect(model.getLineContent(2)).toBe('');
    });
  });
});
