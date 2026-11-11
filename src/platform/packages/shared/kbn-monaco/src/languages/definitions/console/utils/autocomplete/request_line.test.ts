/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findRequestLineNumber, isRequestLineWithUrl } from './request_line';

describe('findRequestLineNumber', () => {
  const fromLines = (lines: string[]) => (lineNumber: number) => lines[lineNumber - 1] ?? '';

  it('returns the cursor line when it is itself the request line', () => {
    expect(findRequestLineNumber(fromLines(['GET _search']), 1)).toBe(1);
  });

  it('scans backwards to the nearest request line', () => {
    const lines = ['POST _query', '{', '\t"script": """', ''];
    expect(findRequestLineNumber(fromLines(lines), 4)).toBe(1);
  });

  it('returns the nearest request line when several precede the cursor', () => {
    const lines = ['GET _search', '{}', 'POST _query', '{', ''];
    expect(findRequestLineNumber(fromLines(lines), 5)).toBe(3);
  });

  it('can return the document start after fully scanning a range with a request line', () => {
    const lines = ['# comment', 'POST _query', '{', '"script": """', 'GET /not-a-request', ''];
    expect(findRequestLineNumber(fromLines(lines), 6, { direction: 'document' })).toBe(1);
  });

  it('does not return the document start from a partially scanned range', () => {
    const lines = ['GET _search', ...new Array(2500).fill('  "filler": 1,')];
    expect(
      findRequestLineNumber(fromLines(lines), lines.length, { direction: 'document' })
    ).toBeUndefined();
  });

  it('does not return the document start when the final scanned line exceeds the character cap', () => {
    const lines = ['x'.repeat(150_000), 'POST _query', '{', '"query": """', 'GET /inside-string'];
    expect(
      findRequestLineNumber(fromLines(lines), lines.length, { direction: 'document' })
    ).toBeUndefined();
  });

  it('does not return the document start when the fully scanned range has no request line', () => {
    const lines = ['# comment', '{', '"field": true', '}'];
    expect(
      findRequestLineNumber(fromLines(lines), lines.length, { direction: 'document' })
    ).toBeUndefined();
  });

  it('returns undefined when no request line precedes the cursor', () => {
    expect(findRequestLineNumber(fromLines(['{', '"a": 1', '}']), 3)).toBeUndefined();
  });

  it('gives up past the line lookback cap instead of scanning the whole buffer', () => {
    // Request line sits far above the cursor, beyond the 2000-line cap.
    const lines = ['GET _search', ...new Array(2500).fill('  "filler": 1,')];
    expect(findRequestLineNumber(fromLines(lines), lines.length)).toBeUndefined();
  });

  it('gives up past the character lookback cap even when the line count is small', () => {
    // Regression guard for https://github.com/elastic/kibana/pull/251173: pasted JSON can hold
    // millions of characters in a handful of lines. Without a character cap, the returned text is
    // scanned character by character on a keystroke path.
    const hugeLine = 'x'.repeat(60_000);
    const lines = ['GET _search', hugeLine, hugeLine, hugeLine];
    expect(findRequestLineNumber(fromLines(lines), lines.length)).toBeUndefined();
  });

  it('still finds a nearby request line when the scanned text stays under the caps', () => {
    const smallLine = 'x'.repeat(1_000);
    const lines = ['GET _search', smallLine, smallLine];
    expect(findRequestLineNumber(fromLines(lines), lines.length)).toBe(1);
  });
});

describe('isRequestLineWithUrl', () => {
  it.each(['GET _search', '  POST /_query?format=json', '\tdelete /idx/1'])(
    'accepts a method followed by a URL: %s',
    (line) => {
      expect(isRequestLineWithUrl(line)).toBe(true);
    }
  );

  it.each(['GET', 'GET ', 'GETS /idx', '"GET /idx"', '{', ''])(
    'rejects a line without a method + URL pair: %s',
    (line) => {
      expect(isRequestLineWithUrl(line)).toBe(false);
    }
  );
});
