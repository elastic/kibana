/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getAutoIndentedRequests,
  getCurlRequest,
  replaceRequestVariables,
  stringifyRequest,
  trackSentRequests,
} from './requests_utils';
import { MetricsTracker } from '../../../../../types';

describe('requests_utils', () => {
  const dataObjects = [
    {
      query: {
        match_all: {},
      },
    },
    {
      test: 'test',
    },
  ];
  describe('stringifyRequest', () => {
    const request = {
      startOffset: 0,
      endOffset: 11,
      method: 'get',
      url: '_search some_text',
    };
    it('calls the "removeTrailingWhitespaces" on the url', () => {
      const stringifiedRequest = stringifyRequest(request);
      expect(stringifiedRequest.url).toBe('_search');
    });

    it('normalizes the method to upper case', () => {
      const stringifiedRequest = stringifyRequest(request);
      expect(stringifiedRequest.method).toBe('GET');
    });
    it('stringifies the request body', () => {
      const result = stringifyRequest({ ...request, data: [dataObjects[0]] });
      expect(result.data.length).toBe(1);
      expect(result.data[0]).toBe(JSON.stringify(dataObjects[0], null, 2));
    });

    it('works for several request bodies', () => {
      const result = stringifyRequest({ ...request, data: dataObjects });
      expect(result.data.length).toBe(2);
      expect(result.data[0]).toBe(JSON.stringify(dataObjects[0], null, 2));
      expect(result.data[1]).toBe(JSON.stringify(dataObjects[1], null, 2));
    });
  });

  describe('replaceRequestVariables', () => {
    const variables = [
      { id: '1', name: 'variable1', value: 'test1' },
      {
        id: '2',
        name: 'variable2',
        value: 'test2',
      },
      {
        id: '3',
        name: 'variable3',
        value: '{"match_all": {}}',
      },
    ];

    describe('replaces variables in the url', () => {
      const request = {
        method: 'GET',
        url: '${variable1}',
        data: [],
      };
      it('when there is no other text', () => {
        const result = replaceRequestVariables(request, variables);
        expect(result.url).toBe('test1');
      });
      it('inside a string', () => {
        const result = replaceRequestVariables(
          { ...request, url: 'test_${variable1}_test' },
          variables
        );
        expect(result.url).toBe('test_test1_test');
      });
      it('works with several variables', () => {
        const result = replaceRequestVariables(
          { ...request, url: '${variable1}_${variable2}' },
          variables
        );
        expect(result.url).toBe('test1_test2');
      });
    });

    describe('replaces variables in the request body', () => {
      const request = {
        method: 'GET',
        url: '${variable1}',
        data: [
          JSON.stringify(
            { '${variable1}': '${variable2}', '${variable2}': '${variable3}' },
            null,
            2
          ),
        ],
      };
      it('works with several variables', () => {
        const result = replaceRequestVariables(request, variables);
        expect(JSON.parse(result.data[0])).toMatchObject({
          test1: 'test2',
          test2: { match_all: {} },
        });
      });
    });
  });

  describe('getCurlRequest', () => {
    it('works without a request body', () => {
      const request = { method: 'GET', url: '_search', data: [] };
      const result = getCurlRequest(request, 'http://test.com');
      expect(result).toBe('curl -XGET "http://test.com/_search" -H "kbn-xsrf: reporting"');
    });
    it('works with a request body', () => {
      const request = {
        method: 'GET',
        url: '_search',
        data: [JSON.stringify(dataObjects[0], null, 2)],
      };
      const result = getCurlRequest(request, 'http://test.com');
      expect(result).toBe(
        'curl -XGET "http://test.com/_search" -H "kbn-xsrf: reporting" -H "Content-Type: application/json" -d\'\n' +
          '{\n' +
          '  "query": {\n' +
          '    "match_all": {}\n' +
          '  }\n' +
          "}'"
      );
    });
    it('works with several request bodies', () => {
      const request = {
        method: 'GET',
        url: '_search',
        data: [JSON.stringify(dataObjects[0], null, 2), JSON.stringify(dataObjects[1], null, 2)],
      };
      const result = getCurlRequest(request, 'http://test.com');
      expect(result).toBe(
        'curl -XGET "http://test.com/_search" -H "kbn-xsrf: reporting" -H "Content-Type: application/json" -d\'\n' +
          '{\n' +
          '  "query": {\n' +
          '    "match_all": {}\n' +
          '  }\n' +
          '}\n' +
          '{\n' +
          '  "test": "test"\n' +
          "}'"
      );
    });
  });

  describe('trackSentRequests', () => {
    it('tracks each request correctly', () => {
      const requests = [
        { method: 'GET', url: '_search', data: [] },
        { method: 'POST', url: '_test', data: [] },
      ];
      const mockMetricsTracker: jest.Mocked<MetricsTracker> = { count: jest.fn(), load: jest.fn() };
      trackSentRequests(requests, mockMetricsTracker);
      expect(mockMetricsTracker.count).toHaveBeenCalledTimes(2);
      expect(mockMetricsTracker.count).toHaveBeenNthCalledWith(1, 'GET__search');
      expect(mockMetricsTracker.count).toHaveBeenNthCalledWith(2, 'POST__test');
    });
  });

  describe('getAutoIndentedRequests', () => {
    const sampleEditorTextLines = [
      '                                    ', // line 1
      'GET    _search                      ', // line 2
      '{                                   ', // line 3
      '  "query":     {                    ', // line 4
      '    "match_all":    {      }        ', // line 5
      '    }                               ', // line 6
      '   }                                ', // line 7
      '                                    ', // line 8
      '// single comment before Request 2  ', // line 9
      '  GET  _all                         ', // line 10
      '                                    ', // line 11
      '/*                                  ', // line 12
      ' multi-line comment before Request 3', // line 13
      '*/                                  ', // line 14
      'POST   /_bulk                       ', // line 15
      '{                                   ', // line 16
      '       "index":{                    ', // line 17
      '          "_index":"books"          ', // line 18
      '     }                              ', // line 19
      ' }                                  ', // line 20
      '{                                   ', // line 21
      '"name":"1984"                       ', // line 22
      '}{"name":"Atomic habits"}           ', // line 23
      '                                    ', // line 24
      'GET    _search  // test comment     ', // line 25
      '{                                   ', // line 26
      '  "query":     {                    ', // line 27
      '    "match_all":    {   } // comment', // line 28
      '    }                               ', // line 29
      '}                                   ', // line 30
      ' // some comment                    ', // line 31
      '                                    ', // line 32
    ];

    const TEST_REQUEST_1 = {
      method: 'GET',
      url: '_search',
      data: [{ query: { match_all: {} } }],
      // Offsets are with respect to the sample editor text
      startLineNumber: 2,
      endLineNumber: 7,
      startOffset: 1,
      endOffset: 36,
    };

    const TEST_REQUEST_2 = {
      method: 'GET',
      url: '_all',
      data: [],
      // Offsets are with respect to the sample editor text
      startLineNumber: 10,
      endLineNumber: 10,
      startOffset: 1,
      endOffset: 36,
    };

    const TEST_REQUEST_3 = {
      method: 'POST',
      url: '/_bulk',
      // Multi-data
      data: [{ index: { _index: 'books' } }, { name: '1984' }, { name: 'Atomic habits' }],
      // Offsets are with respect to the sample editor text
      startLineNumber: 15,
      endLineNumber: 23,
      startOffset: 1,
      endOffset: 36,
    };

    const TEST_REQUEST_4 = {
      method: 'GET',
      url: '_search',
      data: [{ query: { match_all: {} } }],
      // Offsets are with respect to the sample editor text
      startLineNumber: 24,
      endLineNumber: 30,
      startOffset: 1,
      endOffset: 36,
    };

    it('correctly auto-indents a single request with data', () => {
      const formattedData = getAutoIndentedRequests(
        [TEST_REQUEST_1],
        sampleEditorTextLines
          .slice(TEST_REQUEST_1.startLineNumber - 1, TEST_REQUEST_1.endLineNumber)
          .join('\n'),
        sampleEditorTextLines.join('\n')
      );
      const expectedResultLines = [
        'GET _search',
        '{',
        '  "query": {',
        '    "match_all": {}',
        '  }',
        '}',
      ];

      expect(formattedData).toBe(expectedResultLines.join('\n'));
    });

    it('correctly auto-indents a single request with no data', () => {
      const formattedData = getAutoIndentedRequests(
        [TEST_REQUEST_2],
        sampleEditorTextLines
          .slice(TEST_REQUEST_2.startLineNumber - 1, TEST_REQUEST_2.endLineNumber)
          .join('\n'),
        sampleEditorTextLines.join('\n')
      );
      const expectedResult = 'GET _all';

      expect(formattedData).toBe(expectedResult);
    });

    it('correctly auto-indents a single request with multiple data', () => {
      const formattedData = getAutoIndentedRequests(
        [TEST_REQUEST_3],
        sampleEditorTextLines
          .slice(TEST_REQUEST_3.startLineNumber - 1, TEST_REQUEST_3.endLineNumber)
          .join('\n'),
        sampleEditorTextLines.join('\n')
      );
      const expectedResultLines = [
        'POST /_bulk',
        '{',
        '  "index": {',
        '    "_index": "books"',
        '  }',
        '}',
        '{',
        '  "name": "1984"',
        '}',
        '{',
        '  "name": "Atomic habits"',
        '}',
      ];

      expect(formattedData).toBe(expectedResultLines.join('\n'));
    });

    it('auto-indents multiple request with comments in between', () => {
      const formattedData = getAutoIndentedRequests(
        [TEST_REQUEST_1, TEST_REQUEST_2, TEST_REQUEST_3],
        sampleEditorTextLines.slice(1, 23).join('\n'),
        sampleEditorTextLines.join('\n')
      );
      const expectedResultLines = [
        'GET _search',
        '{',
        '  "query": {',
        '    "match_all": {}',
        '  }',
        '}',
        '',
        '// single comment before Request 2',
        'GET _all',
        '',
        '/*',
        'multi-line comment before Request 3',
        '*/',
        'POST /_bulk',
        '{',
        '  "index": {',
        '    "_index": "books"',
        '  }',
        '}',
        '{',
        '  "name": "1984"',
        '}',
        '{',
        '  "name": "Atomic habits"',
        '}',
      ];

      expect(formattedData).toBe(expectedResultLines.join('\n'));
    });

    it('does not auto-indent a request with comments', () => {
      const requestText = sampleEditorTextLines
        .slice(TEST_REQUEST_4.startLineNumber - 1, TEST_REQUEST_4.endLineNumber)
        .join('\n');
      const formattedData = getAutoIndentedRequests(
        [TEST_REQUEST_4],
        requestText,
        sampleEditorTextLines.join('\n')
      );

      expect(formattedData).toBe(requestText);
    });
  });
});
