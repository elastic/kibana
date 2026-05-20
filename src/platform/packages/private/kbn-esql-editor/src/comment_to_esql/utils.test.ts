/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/code-editor';
import {
  findTargetComment,
  insertGeneratedCode,
  isModelStillValid,
  markCommentInQuery,
} from './utils';

const buildModel = (lines: string[], options?: { isDisposed?: boolean }) => {
  const isDisposed = options?.isDisposed ?? false;
  return {
    getLineContent: jest.fn((lineNumber: number) => lines[lineNumber - 1] ?? ''),
    getLineCount: jest.fn(() => lines.length),
    isDisposed: jest.fn(() => isDisposed),
  } as unknown as monaco.editor.ITextModel;
};

describe('comment_to_esql/utils', () => {
  describe('findTargetComment', () => {
    it('returns the comment when the line starts with //', () => {
      const model = buildModel(['FROM logs', '// summarise per host']);
      expect(findTargetComment(model, 2)).toEqual({
        lineNumber: 2,
        text: '// summarise per host',
      });
    });

    it('trims leading whitespace before checking the prefix', () => {
      const model = buildModel(['   // indented comment']);
      expect(findTargetComment(model, 1)).toEqual({
        lineNumber: 1,
        text: '// indented comment',
      });
    });

    it('returns null for non-comment lines', () => {
      const model = buildModel(['FROM logs | LIMIT 10']);
      expect(findTargetComment(model, 1)).toBeNull();
    });

    it('returns the comment even when it is empty (just the slashes)', () => {
      const model = buildModel(['//']);
      expect(findTargetComment(model, 1)).toEqual({ lineNumber: 1, text: '//' });
    });
  });

  describe('markCommentInQuery', () => {
    it('wraps the target line with the >>> <<< sentinels', () => {
      const text = 'FROM logs\n// summarise\n| LIMIT 10';
      expect(markCommentInQuery(text, 2)).toBe('FROM logs\n>>> // summarise <<<\n| LIMIT 10');
    });

    it('marks the first line', () => {
      const text = '// at the top\nFROM logs';
      expect(markCommentInQuery(text, 1)).toBe('>>> // at the top <<<\nFROM logs');
    });

    it('marks the last line', () => {
      const text = 'FROM logs\n// at the bottom';
      expect(markCommentInQuery(text, 2)).toBe('FROM logs\n>>> // at the bottom <<<');
    });

    it('handles a single-line query', () => {
      expect(markCommentInQuery('// only line', 1)).toBe('>>> // only line <<<');
    });
  });

  describe('isModelStillValid', () => {
    it('returns false when the model is undefined', () => {
      expect(isModelStillValid(undefined, 1)).toBe(false);
    });

    it('returns false when the model is disposed', () => {
      const model = buildModel(['// comment'], { isDisposed: true });
      expect(isModelStillValid(model, 1)).toBe(false);
    });

    it('returns false when commentLineNumber exceeds the line count', () => {
      const model = buildModel(['// comment']);
      expect(isModelStillValid(model, 5)).toBe(false);
    });

    it('returns false when the line is no longer a comment', () => {
      const model = buildModel(['FROM logs']);
      expect(isModelStillValid(model, 1)).toBe(false);
    });

    it('returns true when the line still starts with // (after trimming)', () => {
      const model = buildModel(['  // still here']);
      expect(isModelStillValid(model, 1)).toBe(true);
    });
  });

  describe('insertGeneratedCode', () => {
    const buildEditor = () =>
      ({
        executeEdits: jest.fn(),
      } as unknown as monaco.editor.IStandaloneCodeEditor);

    it('inserts on the next line and returns the matching range when not on the last line', () => {
      const editor = buildEditor();
      const model = buildModel(['// generate', 'FROM logs']);

      const result = insertGeneratedCode(editor, model, 1, '| LIMIT 10\n| KEEP foo\n');

      expect(result).toEqual({ generatedLineStart: 2, generatedLineEnd: 3 });
      expect(editor.executeEdits).toHaveBeenCalledTimes(1);
      const [, edits] = (editor.executeEdits as jest.Mock).mock.calls[0];
      expect(edits[0].range).toEqual(new monaco.Range(2, 1, 2, 1));
      expect(edits[0].text).toBe('| LIMIT 10\n| KEEP foo\n');
    });

    it('appends a trailing newline when the generated text does not end with one', () => {
      const editor = buildEditor();
      const model = buildModel(['// generate', 'FROM logs']);

      insertGeneratedCode(editor, model, 1, '| LIMIT 10');

      const [, edits] = (editor.executeEdits as jest.Mock).mock.calls[0];
      expect(edits[0].text).toBe('| LIMIT 10\n');
    });

    it('inserts after the existing content with a leading newline when on the last line', () => {
      const editor = buildEditor();
      const model = buildModel(['FROM logs', '// generate']);

      const result = insertGeneratedCode(editor, model, 2, '| LIMIT 10\n');

      expect(result).toEqual({ generatedLineStart: 3, generatedLineEnd: 3 });
      const [, edits] = (editor.executeEdits as jest.Mock).mock.calls[0];
      // On the last line we insert at the end-of-line column with a leading newline
      expect(edits[0].text).toBe('\n| LIMIT 10\n');
      // Range is at the end of the existing comment line ('// generate'.length === 11, so column 12)
      expect(edits[0].range).toEqual(new monaco.Range(2, 12, 2, 12));
    });

    it('counts multi-line generations correctly in the returned range', () => {
      const editor = buildEditor();
      const model = buildModel(['// generate', 'FROM logs']);

      const result = insertGeneratedCode(editor, model, 1, '| LIMIT 10\n| KEEP foo\n| SORT bar\n');

      expect(result).toEqual({ generatedLineStart: 2, generatedLineEnd: 4 });
    });
  });
});
