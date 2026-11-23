/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '../../../monaco_imports';
import { getFallbackRequestStartPosition } from './request_anchor';

describe('getFallbackRequestStartPosition', () => {
  const createModel = (lines: string[]) => {
    const getPositionAt = jest.fn((offset: number) => {
      let remainingOffset = offset;
      for (const [index, line] of lines.entries()) {
        if (remainingOffset <= line.length) {
          return { lineNumber: index + 1, column: remainingOffset + 1 };
        }
        remainingOffset -= line.length + 1;
      }
      return { lineNumber: lines.length, column: lines.at(-1)?.length ?? 1 };
    });
    const getOffsetAt = jest.fn(({ lineNumber, column }: monaco.IPosition) => {
      const precedingLinesLength = lines
        .slice(0, lineNumber - 1)
        .reduce((length, line) => length + line.length + 1, 0);
      return precedingLinesLength + column - 1;
    });
    const getValueInRange = jest.fn(
      ({ startLineNumber, startColumn, endLineNumber, endColumn }: monaco.IRange) => {
        if (startLineNumber === endLineNumber) {
          return (lines[startLineNumber - 1] ?? '').slice(startColumn - 1, endColumn - 1);
        }

        const selectedLines = lines.slice(startLineNumber - 1, endLineNumber);
        selectedLines[0] = selectedLines[0].slice(startColumn - 1);
        selectedLines[selectedLines.length - 1] = selectedLines[selectedLines.length - 1].slice(
          0,
          endColumn - 1
        );
        return selectedLines.join('\n');
      }
    );
    const getWordUntilPosition = jest.fn(({ column }: monaco.IPosition) => ({
      word: '',
      startColumn: column,
      endColumn: column,
    }));
    return {
      getLineCount: () => lines.length,
      getLineContent: (lineNumber: number) => lines[lineNumber - 1] ?? '',
      getOffsetAt,
      getPositionAt,
      getValueInRange,
      getWordUntilPosition,
    } as unknown as jest.Mocked<monaco.editor.ITextModel>;
  };

  it('caps malformed parsed-request inspection', () => {
    const lines = new Array(2501).fill('"""');
    const model = createModel(lines);
    const parsedRequests = lines.map((_, index) => ({ startOffset: index * 4 }));

    const result = getFallbackRequestStartPosition(parsedRequests, model, lines.length);

    expect(result).toBeUndefined();
    expect(model.getPositionAt).toHaveBeenCalledTimes(2000);
  });

  it('caps parsed-request inspection by source characters', () => {
    const lines = ['GET /one', 'x'.repeat(100_001)];
    const model = createModel(lines);
    const parsedRequests = [{ startOffset: 0 }, { startOffset: lines[0].length + 1 }];

    const result = getFallbackRequestStartPosition(parsedRequests, model, lines.length);

    expect(result).toBeUndefined();
    expect(model.getPositionAt).toHaveBeenCalledTimes(1);
  });

  it('caps cumulative parsed-request materialization', () => {
    const lines = [
      `GET /${'one'.repeat(16_667)}`,
      `GET /${'two'.repeat(16_667)}`,
      `GET /${'three'.repeat(3_333)}`,
    ];
    const model = createModel(lines);
    const secondStartOffset = lines[0].length + 1;
    const thirdStartOffset = secondStartOffset + lines[1].length + 1;
    const parsedRequests = [
      { startOffset: 0, endOffset: lines[0].length },
      { startOffset: secondStartOffset, endOffset: secondStartOffset + lines[1].length },
      { startOffset: thirdStartOffset, endOffset: thirdStartOffset + lines[2].length },
    ];

    const result = getFallbackRequestStartPosition(parsedRequests, model, lines.length);

    expect(result).toEqual({ lineNumber: 3, column: 1 });
    expect(model.getValueInRange).toHaveBeenCalledTimes(2);
  });

  it('charges each source character once against the budget', () => {
    // The enclosing request ends within one request-line length of the cap: a budget that
    // charged the request line twice bailed here and returned the recovery artifact instead.
    const filler = 'x'.repeat(99_940);
    const lines = ['POST _index/_doc', `{"script":"""`, filler, 'GET _search', ''];
    const postEndOffset = lines.slice(0, 3).join('\n').length;
    const parsedRequests = [
      { startOffset: 0, endOffset: postEndOffset },
      { startOffset: postEndOffset + 1, endOffset: postEndOffset + 1 + 'GET _search'.length },
    ];
    const model = createModel(lines);

    const result = getFallbackRequestStartPosition(parsedRequests, model, lines.length, 1);

    expect(result).toEqual({ lineNumber: 1, column: 1 });
  });

  it('does not return an oversized unterminated request as the fallback start', () => {
    const lines = ['GET /foo', 'x'.repeat(100_001)];
    const model = createModel(lines);
    const parsedRequests = [{ startOffset: 0 }];

    const result = getFallbackRequestStartPosition(parsedRequests, model, lines.length);

    expect(result).toBeUndefined();
    expect(model.getValueInRange).not.toHaveBeenCalled();
  });

  it('excludes an inline comment prefix from parsed request materialization', () => {
    const prefix = `/*${'x'.repeat(100_000)}*/ `;
    const lines = [`${prefix}GET /foo`, '{"field": true}'];
    const model = createModel(lines);
    const parsedRequests = [{ startOffset: prefix.length, endOffset: lines.join('\n').length }];

    const result = getFallbackRequestStartPosition(parsedRequests, model, lines.length);

    expect(result).toEqual({ lineNumber: 1, column: prefix.length + 1 });
    expect(model.getValueInRange).toHaveBeenCalledWith(
      expect.objectContaining({ startLineNumber: 1, startColumn: prefix.length + 1 })
    );
  });

  it('continues past a parsed request without an end offset', () => {
    const lines = ['POST _query', '{"script":"""', 'POST _query', '{'];
    const model = createModel(lines);
    const parsedRequests = [{ startOffset: 0, endOffset: 24 }, { startOffset: 26 }];

    const result = getFallbackRequestStartPosition(parsedRequests, model, lines.length);

    expect(result).toEqual({ lineNumber: 1, column: 1 });
  });
});
