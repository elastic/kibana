/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createParser } from './parser';
import type { ConsoleParserResult } from './types';

const parser = createParser();
describe('console parser', () => {
  it('returns errors if input is not correct', () => {
    const input = 'Incorrect input';
    const parserResult = parser(input) as ConsoleParserResult;
    // the parser logs 2 errors: for the unexpected method and a general syntax error
    expect(parserResult.errors.length).toBe(2);
    // the parser logs a beginning of the request that it's trying to parse
    expect(parserResult.requests.length).toBe(1);
  });

  it('returns parsedRequests if the input is correct', () => {
    const input = 'GET _search';
    const { requests, errors } = parser(input) as ConsoleParserResult;
    expect(requests.length).toBe(1);
    expect(errors.length).toBe(0);
    const { startOffset, endOffset } = requests[0];
    // the start offset of the request is the beginning of the string
    expect(startOffset).toBe(0);
    // the end offset of the request is the end of the string
    expect(endOffset).toBe(11);
  });

  it('parses several requests', () => {
    const input = 'GET _search\nPOST _test_index';
    const { requests } = parser(input) as ConsoleParserResult;
    expect(requests.length).toBe(2);
    expect(requests[0].startOffset).toBe(0);
    expect(requests[0].endOffset).toBe(11);
    expect(requests[1].startOffset).toBe(12);
    expect(requests[1].endOffset).toBe(28);
  });

  it('parses a request with a request body', () => {
    const input =
      'GET _search\n' + '{\n' + '  "query": {\n' + '    "match_all": {}\n' + '  }\n' + '}';
    const { requests } = parser(input) as ConsoleParserResult;
    expect(requests.length).toBe(1);
    const { startOffset, endOffset } = requests[0];
    expect(startOffset).toBe(0);
    expect(endOffset).toBe(52);
  });

  it('parses requests with an error', () => {
    const input =
      'GET _search\n' +
      '{ERROR\n' +
      '  "query": {\n' +
      '    "match_all": {}\n' +
      '  }\n' +
      '}\n\n' +
      'POST _test_index';
    const { requests, errors } = parser(input) as ConsoleParserResult;
    expect(requests.length).toBe(2);
    expect(requests[0].startOffset).toBe(0);
    expect(requests[0].endOffset).toBe(57);
    expect(requests[1].startOffset).toBe(59);
    expect(requests[1].endOffset).toBe(75);
    expect(errors.length).toBe(1);
    expect(errors[0].offset).toBe(14);
    expect(errors[0].text).toBe('Bad string');
  });

  it('parses requests with an error and a comment before the next request', () => {
    const input =
      'GET _search\n' +
      '{ERROR\n' +
      '  "query": {\n' +
      '    "match_all": {}\n' +
      '  }\n' +
      '}\n\n' +
      '# This is a comment\n' +
      'POST _test_index\n' +
      '// Another comment\n';
    const { requests, errors } = parser(input) as ConsoleParserResult;
    expect(requests.length).toBe(2);
    expect(requests[0].startOffset).toBe(0);
    expect(requests[0].endOffset).toBe(57);
    expect(requests[1].startOffset).toBe(79); // The next request should start after the comment
    expect(requests[1].endOffset).toBe(95);
    expect(errors.length).toBe(1);
    expect(errors[0].offset).toBe(14);
    expect(errors[0].text).toBe('Bad string');
  });

  describe('case insensitive methods', () => {
    const expectedRequests = [
      {
        startOffset: 0,
        endOffset: 11,
      },
      {
        startOffset: 12,
        endOffset: 24,
      },
      {
        startOffset: 25,
        endOffset: 38,
      },
      {
        startOffset: 39,
        endOffset: 50,
      },
      {
        startOffset: 51,
        endOffset: 63,
      },
    ];
    it('allows upper case methods', () => {
      const input = 'GET _search\nPOST _search\nPATCH _search\nPUT _search\nHEAD _search';
      const { requests, errors } = parser(input) as ConsoleParserResult;
      expect(errors.length).toBe(0);
      expect(requests).toEqual(expectedRequests);
    });

    it('allows lower case methods', () => {
      const input = 'get _search\npost _search\npatch _search\nput _search\nhead _search';
      const { requests, errors } = parser(input) as ConsoleParserResult;
      expect(errors.length).toBe(0);
      expect(requests).toEqual(expectedRequests);
    });

    it('allows mixed case methods', () => {
      const input = 'GeT _search\npOSt _search\nPaTch _search\nPut _search\nheAD _search';
      const { requests, errors } = parser(input) as ConsoleParserResult;
      expect(errors.length).toBe(0);
      expect(requests).toEqual(expectedRequests);
    });
  });

  describe('request-line method boundary', () => {
    // The first token of a request line must have one canonical method
    // interpretation. A valid method prefix followed by non-whitespace
    // characters (e.g. `GETT`, `POSTS`, `PUThjjkjoj`) must not be silently
    // accepted as the matching method with a malformed url tail.
    const methodBoundaryError = 'Expected one of GET/POST/PUT/DELETE/HEAD/PATCH';

    it('rejects a valid method prefix followed by extra letters (`GETT _search`)', () => {
      const { errors } = parser('GETT _search') as ConsoleParserResult;
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].text).toBe(methodBoundaryError);
    });

    it('rejects a valid method prefix followed by an `S` suffix (`POSTS _search`)', () => {
      const { errors } = parser('POSTS _search') as ConsoleParserResult;
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].text).toBe(methodBoundaryError);
    });

    it('rejects a method with arbitrary trailing characters (`PUThjjkjoj /my-index`)', () => {
      const { errors } = parser('PUThjjkjoj /my-index') as ConsoleParserResult;
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].text).toBe(methodBoundaryError);
    });

    it('recovers and continues parsing the next request after an invalid method line', () => {
      const input = 'GETT _search\nPOST _bulk';
      const { requests, errors } = parser(input) as ConsoleParserResult;
      // First request is invalid: errors are recorded
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].text).toBe(methodBoundaryError);
      // Second request is parsed correctly
      const validRequest = requests.find(
        (r) => r.endOffset !== undefined && r.endOffset >= 'GETT _search\n'.length
      );
      expect(validRequest).toBeDefined();
    });

    it('marks every consecutive invalid-method-prefix line, not only the first', () => {
      const input = 'PUThjjkjoj /my-index\nGETT _search\nPOSTS _bulk\nGET _ok';
      const { requests, errors } = parser(input) as ConsoleParserResult;
      // Each of the three invalid-prefix lines must produce its own marker
      // so users see them all, not only the first one.
      const boundaryErrors = errors.filter((e) => e.text === methodBoundaryError);
      expect(boundaryErrors.length).toBe(3);
      // The final valid request must also be captured despite the preceding
      // boundary errors.
      const validRequest = requests.find(
        (r) =>
          r.startOffset === 'PUThjjkjoj /my-index\nGETT _search\nPOSTS _bulk\n'.length &&
          r.endOffset !== undefined
      );
      expect(validRequest).toBeDefined();
    });

    // The boundary is "next character separates the method from the URL/body".
    // These tables lock in which inputs are accepted vs rejected.
    it.each([
      ['GET_index', 'underscore'],
      ['GET2 _x', 'digit'],
      ['GETSomething', 'letter'],
      ['HEADX _x', 'letter'],
      ['DELETEX _x', 'letter'],
      ['PATCHX _x', 'letter'],
      ['GET/_search', 'slash'],
      ['GET?q=1', 'question mark'],
      ['GET-foo', 'dash'],
      ['GET*', 'star'],
    ])('rejects invalid method boundary: %s (%s)', (input) => {
      const { errors } = parser(input) as ConsoleParserResult;
      expect(errors.length).toBe(1);
      expect(errors[0].text).toBe(methodBoundaryError);
      expect(errors[0].offset).toBe(0);
      expect(errors[0].endOffset).toBe(input.split(/[ \t\r\n]/)[0].length);
    });

    it.each([
      ['GET _search', 'space'],
      ['GET\t_search', 'tab'],
      ['GET', 'end-of-input'],
    ])('accepts request-line separator after method: %s (%s)', (input) => {
      const { errors, requests } = parser(input) as ConsoleParserResult;
      expect(errors.filter((e) => e.text === methodBoundaryError)).toEqual([]);
      expect(requests.length).toBe(1);
    });

    it('does not falsely flag a method whose url contains identifier chars (`GET _index_internal`)', () => {
      const { errors, requests } = parser('GET _index_internal') as ConsoleParserResult;
      expect(errors).toEqual([]);
      expect(requests.length).toBe(1);
    });
  });

  describe('CRLF line endings (Windows)', () => {
    it('parses a single request with CRLF line endings without errors', () => {
      const input = 'GET _search\r\n';
      const { requests, errors } = parser(input)!;
      expect(errors).toEqual([]);
      expect(requests.length).toBe(1);
    });

    it('parses a bulk request with CRLF line endings without errors', () => {
      const input = 'POST /_bulk\r\n{"create": {}}\r\n{"field": "value"}\r\n';
      const { requests, errors } = parser(input)!;
      expect(errors).toEqual([]);
      expect(requests.length).toBe(1);
    });

    it('parses multiple requests separated by CRLF without errors', () => {
      const input = 'GET _search\r\nPOST _test_index\r\n';
      const { requests, errors } = parser(input)!;
      expect(errors).toEqual([]);
      expect(requests.length).toBe(2);
    });
  });
});
