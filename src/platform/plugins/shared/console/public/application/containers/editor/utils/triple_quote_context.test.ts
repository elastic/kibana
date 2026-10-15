/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createParser } from '@kbn/monaco/src/console/parser';
import type { monaco } from '@kbn/monaco';
import type { AdjustedParsedRequest } from '../types';
import { getTripleQuoteContext } from './triple_quote_context';

const createModel = (lines: string[]): monaco.editor.ITextModel => {
  const getPositionAt = (offset: number): monaco.IPosition => {
    let remainingOffset = offset;
    for (const [index, line] of lines.entries()) {
      if (remainingOffset <= line.length) {
        return { lineNumber: index + 1, column: remainingOffset + 1 };
      }
      remainingOffset -= line.length + 1;
    }
    return { lineNumber: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
  };

  return {
    getLineContent: (lineNumber: number) => lines[lineNumber - 1] ?? '',
    getOffsetAt: ({ lineNumber, column }: monaco.IPosition) =>
      lines.slice(0, lineNumber - 1).reduce((offset, line) => offset + line.length + 1, 0) +
      column -
      1,
    getPositionAt,
    getValueInRange: ({
      startLineNumber,
      startColumn,
      endLineNumber,
      endColumn,
    }: monaco.IRange) => {
      const rangeLines = lines.slice(startLineNumber - 1, endLineNumber);
      rangeLines[0] = rangeLines[0].slice(startColumn - 1);
      const lastRangeLine = rangeLines.at(-1) ?? '';
      rangeLines[rangeLines.length - 1] = lastRangeLine.slice(0, endColumn - 1);
      return rangeLines.join('\n');
    },
  } as monaco.editor.ITextModel;
};

describe('getTripleQuoteContext', () => {
  it('SHOULD prefer the enclosing request over a parser-recovered request inside a script string', () => {
    const lines = ['POST _search', '{ "script": """', 'GET /not-a-request'];
    const model = createModel(lines);
    const parsedRequests = createParser()(lines.join('\n'), undefined)?.requests ?? [];
    const recoveredRequest = parsedRequests.at(-1);
    if (!recoveredRequest) {
      throw new Error('expected a recovered request');
    }
    const selectedRequests: AdjustedParsedRequest[] = [
      { ...recoveredRequest, startLineNumber: 3, endLineNumber: 3 },
    ];

    expect(
      getTripleQuoteContext(model, { lineNumber: 3, column: 5 }, selectedRequests, parsedRequests)
    ).toEqual({ insideTripleQuotes: true, insideEsqlQuery: false, insideString: true });
  });

  it('SHOULD retain ES|QL context for a parser-recovered request inside a query string', () => {
    const lines = ['POST _query', '{ "query": """', 'GET /part-of-query'];
    const model = createModel(lines);
    const parsedRequests = createParser()(lines.join('\n'), undefined)?.requests ?? [];
    const recoveredRequest = parsedRequests.at(-1);
    if (!recoveredRequest) {
      throw new Error('expected a recovered request');
    }
    const selectedRequests: AdjustedParsedRequest[] = [
      { ...recoveredRequest, startLineNumber: 3, endLineNumber: 3 },
    ];

    expect(
      getTripleQuoteContext(model, { lineNumber: 3, column: 5 }, selectedRequests, parsedRequests)
    ).toEqual({ insideTripleQuotes: true, insideEsqlQuery: true, insideString: true });
  });
});
