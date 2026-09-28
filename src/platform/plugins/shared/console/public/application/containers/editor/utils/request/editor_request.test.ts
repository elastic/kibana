/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { performance } from 'node:perf_hooks';

import type { monaco, ParsedRequest } from '@kbn/monaco';
import { getRequestEndLineNumber, getRequestFromEditor } from './editor_request';

describe('editor_request', () => {
  const inlineData = '{"query":"test"}';
  const multiLineData = '{\n  "query": "test"\n}';
  const invalidData = '{\n  "query":\n    {';

  const getMockModel = (content: string[]) => {
    return {
      getLineContent: (lineNumber: number) => content[lineNumber - 1],
      getValueInRange: ({
        startLineNumber,
        endLineNumber,
      }: {
        startLineNumber: number;
        endLineNumber: number;
      }) => content.slice(startLineNumber - 1, endLineNumber).join('\n'),
      getLineMaxColumn: (lineNumber: number) => content[lineNumber - 1].length,
      getLineCount: () => content.length,
    } as unknown as monaco.editor.ITextModel;
  };
  describe('getRequestEndLineNumber', () => {
    const parsedRequest: ParsedRequest = {
      startOffset: 1,
    };
    it('detects the end of the request when there is a line that starts with a method (next not parsed request)', () => {
      /*
       * Mocking the model to return these 6 lines of text
       * 1. GET /_search
       * 2. {
       * 3. empty
       * 4. empty
       * 5. POST _search
       * 6. empty
       */
      const content = ['GET /_search', '{', '', '', 'POST _search', ''];
      const model = {
        ...getMockModel(content),
        getPositionAt: () => ({ lineNumber: 1 }),
      } as unknown as monaco.editor.ITextModel;

      const result = getRequestEndLineNumber({
        parsedRequest,
        model,
        startLineNumber: 1,
      });
      expect(result).toEqual(2);
    });

    it('detects the end of the request when the text ends', () => {
      /*
       * Mocking the model to return these 4 lines of text
       * 1. GET /_search
       * 2. {
       * 3.   {
       * 4. empty
       */
      const content = ['GET _search', '{', '  {', ''];
      const model = {
        ...getMockModel(content),
        getPositionAt: () => ({ lineNumber: 1 }),
      } as unknown as monaco.editor.ITextModel;

      const result = getRequestEndLineNumber({
        parsedRequest,
        model,
        startLineNumber: 1,
      });
      expect(result).toEqual(3);
    });

    it('keeps request-like lines inside an unfinished triple-quoted value in the request', () => {
      const content = ['POST _query', '{', '  "script": """', '  GET _all', '  {', '', '  }'];
      const model = {
        ...getMockModel(content),
        getPositionAt: () => ({ lineNumber: 1 }),
      } as unknown as monaco.editor.ITextModel;

      const result = getRequestEndLineNumber({
        parsedRequest,
        model,
        startLineNumber: 1,
      });

      expect(result).toEqual(7);

      expect(
        getRequestEndLineNumber({
          parsedRequest,
          model,
          startLineNumber: 4,
        })
      ).toEqual(7);
    });

    it('still detects the next request after a completed triple-quoted value', () => {
      const content = ['POST _query', '{', '  "script": """done"""', '}', 'GET _search'];
      const model = {
        ...getMockModel(content),
        getPositionAt: () => ({ lineNumber: 1 }),
      } as unknown as monaco.editor.ITextModel;

      const result = getRequestEndLineNumber({
        parsedRequest,
        model,
        startLineNumber: 1,
      });

      expect(result).toEqual(4);
    });

    it('skips request-like lines inside a closed multi-line triple-quoted value and stops at the next request', () => {
      const content = [
        'POST _query',
        '{',
        '  "script": """',
        '  GET _all',
        '  """',
        '}',
        'GET _search',
      ];
      const model = {
        ...getMockModel(content),
        getPositionAt: () => ({ lineNumber: 1 }),
      } as unknown as monaco.editor.ITextModel;

      const result = getRequestEndLineNumber({
        parsedRequest,
        model,
        startLineNumber: 1,
      });

      expect(result).toEqual(6);
    });

    it('detects the next request when empty lines precede a closed string value', () => {
      // Pins the per-line offset accumulation: empty lines contribute only their newline,
      // so a drifted offset for POST /b would fall back inside the closed "abc" string.
      const content = ['GET /a', '{', '', '', '  "s": "abc"', 'POST /b'];
      const model = {
        ...getMockModel(content),
        getPositionAt: () => ({ lineNumber: 1 }),
      } as unknown as monaco.editor.ITextModel;

      const result = getRequestEndLineNumber({
        parsedRequest,
        model,
        startLineNumber: 1,
      });

      expect(result).toEqual(5);
    });

    it('ignores a stray quote on the request line when the request starts after a block comment', () => {
      const content = ['/* c', ' */ GET x"', '{"a": ', 'GET y'];
      const model = {
        ...getMockModel(content),
        getPositionAt: () => ({ lineNumber: 2 }),
      } as unknown as monaco.editor.ITextModel;

      const result = getRequestEndLineNumber({
        parsedRequest,
        model,
        startLineNumber: 2,
      });

      expect(result).toEqual(3);
    });

    it('does not treat a quote in the request line url as an unfinished string', () => {
      const content = ['GET /a"b', 'POST /c'];
      const model = {
        ...getMockModel(content),
        getPositionAt: () => ({ lineNumber: 1 }),
      } as unknown as monaco.editor.ITextModel;

      const result = getRequestEndLineNumber({
        parsedRequest,
        model,
        startLineNumber: 1,
      });

      expect(result).toEqual(1);
    });

    it('resolves a large unfinished triple-quoted body with many request-like lines quickly', () => {
      const content = [
        'POST _query',
        '{',
        '  "script": """',
        ...Array.from({ length: 5000 }, () => 'GET _all?padding-to-make-the-line-longer'),
      ];
      const model = {
        ...getMockModel(content),
        getPositionAt: () => ({ lineNumber: 1 }),
      } as unknown as monaco.editor.ITextModel;
      const start = performance.now();

      const result = getRequestEndLineNumber({
        parsedRequest,
        model,
        startLineNumber: 1,
      });

      expect(result).toEqual(content.length);
      expect(performance.now() - start).toBeLessThan(500);
    });
  });

  describe('getRequestFromEditor', () => {
    it('cleans up any text following the url', () => {
      const content = ['GET _search // inline comment'];
      const model = getMockModel(content);
      const request = getRequestFromEditor(model, 1, 1);
      expect(request).toEqual({ method: 'GET', url: '_search', data: [] });
    });

    it(`doesn't incorrectly removes parts of url params that include whitespaces`, () => {
      const content = ['GET _search?query="test test"'];
      const model = getMockModel(content);
      const request = getRequestFromEditor(model, 1, 1);
      expect(request).toEqual({ method: 'GET', url: '_search?query="test test"', data: [] });
    });

    it(`normalizes method to upper case`, () => {
      const content = ['get _search'];
      const model = getMockModel(content);
      const request = getRequestFromEditor(model, 1, 1);
      expect(request).toEqual({ method: 'GET', url: '_search', data: [] });
    });

    it('correctly includes the request body', () => {
      const content = ['GET _search', '{', '  "query": {}', '}'];
      const model = getMockModel(content);
      const request = getRequestFromEditor(model, 1, 4);
      expect(request).toEqual({ method: 'GET', url: '_search', data: ['{\n  "query": {}\n}'] });
    });

    it('correctly handles nested braces', () => {
      const content = ['GET _search', '{', '  "query": "{a} {b}"', '}', '{', '  "query": {}', '}'];
      const model = getMockModel(content);
      const request = getRequestFromEditor(model, 1, 7);
      expect(request).toEqual({
        method: 'GET',
        url: '_search',
        data: ['{\n  "query": "{a} {b}"\n}', '{\n  "query": {}\n}'],
      });
    });

    it('works for several request bodies', () => {
      const content = ['GET _search', '{', '  "query": {}', '}', '{', '  "query": {}', '}'];
      const model = getMockModel(content);
      const request = getRequestFromEditor(model, 1, 7);
      expect(request).toEqual({
        method: 'GET',
        url: '_search',
        data: ['{\n  "query": {}\n}', '{\n  "query": {}\n}'],
      });
    });

    it('splits several json objects', () => {
      const content = ['GET _search', inlineData, ...multiLineData.split('\n'), inlineData];
      const model = getMockModel(content);
      const request = getRequestFromEditor(model, 1, 6);
      expect(request).toEqual({
        method: 'GET',
        url: '_search',
        data: [inlineData, multiLineData, inlineData],
      });
    });
    it('works for invalid json objects', () => {
      const content = ['GET _search', inlineData, ...invalidData.split('\n')];
      const model = getMockModel(content);
      const request = getRequestFromEditor(model, 1, 5);
      expect(request).toEqual({
        method: 'GET',
        url: '_search',
        data: [inlineData, invalidData],
      });
    });
  });
});
