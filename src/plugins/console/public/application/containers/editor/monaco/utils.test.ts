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
  getDocumentationLinkFromAutocompleteContext,
  removeTrailingWhitespaces,
  replaceRequestVariables,
  stringifyRequest,
  tokenizeRequestUrl,
  trackSentRequests,
  isStartOfRequest,
} from './utils';
import { MetricsTracker } from '../../../../types';
import { AutoCompleteContext } from '../../../../lib/autocomplete/types';

describe('monaco editor utils', () => {
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
  describe('removeTrailingWhitespaces', () => {
    it(`works with an empty string`, () => {
      const url = '';
      const result = removeTrailingWhitespaces(url);
      expect(result).toBe(url);
    });
    it(`doesn't change the string if no trailing whitespaces`, () => {
      const url = '_search';
      const result = removeTrailingWhitespaces(url);
      expect(result).toBe(url);
    });
    it(`removes any text after the first whitespace`, () => {
      const url = '_search some_text';
      const result = removeTrailingWhitespaces(url);
      expect(result).toBe('_search');
    });
  });

  describe('stringifyRequest', () => {
    const request = {
      startOffset: 0,
      endOffset: 11,
      method: 'get',
      url: '_search some_text',
      text: 'get _search some_text',
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
    ];

    describe('replaces variables in the url', () => {
      const request = {
        method: 'GET',
        url: '${variable1}',
        data: [],
        text: 'GET ${variable1}',
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
        data: [JSON.stringify({ '${variable1}': '${variable2}' }, null, 2)],
        text: '',
      };
      it('works with several variables', () => {
        const result = replaceRequestVariables(request, variables);
        expect(result.data[0]).toBe(JSON.stringify({ test1: 'test2' }, null, 2));
      });
    });
  });

  describe('getCurlRequest', () => {
    it('works without a request body', () => {
      const request = { method: 'GET', url: '_search', data: [], text: '' };
      const result = getCurlRequest(request, 'http://test.com');
      expect(result).toBe('curl -XGET "http://test.com/_search" -H "kbn-xsrf: reporting"');
    });
    it('works with a request body', () => {
      const request = {
        method: 'GET',
        url: '_search',
        data: [JSON.stringify(dataObjects[0], null, 2)],
        text: '',
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
        text: '',
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
        { method: 'GET', url: '_search', data: [], text: '' },
        { method: 'POST', url: '_test', data: [], text: '' },
      ];
      const mockMetricsTracker: jest.Mocked<MetricsTracker> = { count: jest.fn(), load: jest.fn() };
      trackSentRequests(requests, mockMetricsTracker);
      expect(mockMetricsTracker.count).toHaveBeenCalledTimes(2);
      expect(mockMetricsTracker.count).toHaveBeenNthCalledWith(1, 'GET__search');
      expect(mockMetricsTracker.count).toHaveBeenNthCalledWith(2, 'POST__test');
    });
  });

  describe('tokenizeRequestUrl', () => {
    it('returns the url if it has only 1 part', () => {
      const url = '_search';
      const urlTokens = tokenizeRequestUrl(url);
      expect(urlTokens).toEqual(['_search', '__url_path_end__']);
    });

    it('returns correct url tokens', () => {
      const url = '_search/test';
      const urlTokens = tokenizeRequestUrl(url);
      expect(urlTokens).toEqual(['_search', 'test', '__url_path_end__']);
    });
  });

  describe('getDocumentationLinkFromAutocompleteContext', () => {
    const version = '8.13';
    const expectedLink = 'http://elastic.co/8.13/_search';
    it('correctly replaces {branch} with the version', () => {
      const endpoint = {
        documentation: 'http://elastic.co/{branch}/_search',
      } as AutoCompleteContext['endpoint'];
      const link = getDocumentationLinkFromAutocompleteContext({ endpoint }, version);
      expect(link).toBe(expectedLink);
    });

    it('correctly replaces /master/ with the version', () => {
      const endpoint = {
        documentation: 'http://elastic.co/master/_search',
      } as AutoCompleteContext['endpoint'];
      const link = getDocumentationLinkFromAutocompleteContext({ endpoint }, version);
      expect(link).toBe(expectedLink);
    });

    it('correctly replaces /current/ with the version', () => {
      const endpoint = {
        documentation: 'http://elastic.co/current/_search',
      } as AutoCompleteContext['endpoint'];
      const link = getDocumentationLinkFromAutocompleteContext({ endpoint }, version);
      expect(link).toBe(expectedLink);
    });
  });

  describe('isStartOfRequest', () => {
    it('correctly matches first lines of requests', () => {
      expect(isStartOfRequest('GET _all')).toBe(true);
      expect(isStartOfRequest('  get   _search   ')).toBe(true);
      expect(isStartOfRequest('POST _all')).toBe(true);
      expect(isStartOfRequest('  post   _search   ')).toBe(true);
      expect(isStartOfRequest('PUT _all')).toBe(true);
      expect(isStartOfRequest('  put   _search   ')).toBe(true);
      expect(isStartOfRequest('DELETE _all')).toBe(true);
      expect(isStartOfRequest('  delete   _search   ')).toBe(true);
      expect(isStartOfRequest('HEAD _all')).toBe(true);
      expect(isStartOfRequest('  head   _search   ')).toBe(true);
      expect(isStartOfRequest('PATCH _all')).toBe(true);
      expect(isStartOfRequest('  patch   _search   ')).toBe(true);
    });

    it('does not match any other lines', () => {
      expect(isStartOfRequest('// comment')).toBe(false);
      expect(isStartOfRequest('/*')).toBe(false);
      expect(isStartOfRequest(' { ')).toBe(false);
      expect(isStartOfRequest('"jdks": 4')).toBe(false);
      expect(isStartOfRequest('   ')).toBe(false);
      expect(isStartOfRequest('')).toBe(false);
      expect(isStartOfRequest(' }')).toBe(false);
    });
  });

  describe('getAutoIndentedRequests', () => {
    const TEST_REQUEST_1 = {
      method: 'GET',
      url: '_search',
      data: ['{\n  "query": {\n    "match_all": {}\n  }\n}'],
      // Non-formatted text
      text: 'GET    _search   \n{    \n  "query":     {\n    "match_all":    {   }\n    }\n}',
    };

    const TEST_REQUEST_2 = {
      method: 'GET',
      url: '_all',
      data: [],
      // Non-formatted text
      text: '  GET  _all ',
    };

    const TEST_REQUEST_3 = {
      method: 'POST',
      url: '/_bulk',
      data: ['{\n  "index": {\n    "_index": "books"\n  }\n}', '{\n  "name": "1984"\n}'],
      // Non-formatted text
      text: 'POST   /_bulk\n{\n"index":{\n"_index":"books"\n}\n}\n{\n"name":"1984"\n}',
    };

    const TEST_REQUEST_4 = {
      method: 'GET',
      url: '_search',
      data: ['{\n  "query": {\n    "match_all": {}\n  }\n}'],
      // Non-formatted text with comments
      text: 'GET    _search  // test \n{    \n  "query":     {\n    "match_all":    {   } // some comment\n    }\n}',
    };

    it('correctly auto-indents a single request with data', () => {
      const formattedData = getAutoIndentedRequests(
        [TEST_REQUEST_1],
        [...TEST_REQUEST_1.text.split('\n')]
      );
      const expectedResult = 'GET _search\n{\n  "query": {\n    "match_all": {}\n  }\n}';
      expect(formattedData).toBe(expectedResult);
    });

    it('correctly auto-indents a single request with no data', () => {
      const formattedData = getAutoIndentedRequests(
        [TEST_REQUEST_2],
        [...TEST_REQUEST_2.text.split('\n')]
      );
      const expectedResult = 'GET _all';

      expect(formattedData).toBe(expectedResult);
    });

    it('correctly auto-indents a single request with multiple data', () => {
      const formattedData = getAutoIndentedRequests(
        [TEST_REQUEST_3],
        [...TEST_REQUEST_3.text.split('\n')]
      );
      const expectedResult =
        'POST /_bulk\n{\n  "index": {\n    "_index": "books"\n  }\n}\n{\n  "name": "1984"\n}';

      expect(formattedData).toBe(expectedResult);
    });

    it('correctly auto-indents multiple request', () => {
      const formattedData = getAutoIndentedRequests(
        [TEST_REQUEST_1, TEST_REQUEST_2, TEST_REQUEST_3],
        [
          ...TEST_REQUEST_1.text.split('\n'),
          '',
          ...TEST_REQUEST_2.text.split('\n'),
          '',
          ...TEST_REQUEST_3.text.split('\n'),
        ]
      );
      const expectedResult =
        'GET _search\n{\n  "query": {\n    "match_all": {}\n  }\n}\n\nGET _all\n\nPOST /_bulk\n{\n  "index": {\n    "_index": "books"\n  }\n}\n{\n  "name": "1984"\n}';

      expect(formattedData).toBe(expectedResult);
    });

    it('auto-indents multiple request with comments in between', () => {
      const formattedData = getAutoIndentedRequests(
        [TEST_REQUEST_1, TEST_REQUEST_2, TEST_REQUEST_3],
        [
          ...TEST_REQUEST_1.text.split('\n'),
          '',
          '// test comment',
          ...TEST_REQUEST_2.text.split('\n'),
          '',
          '/*',
          ' some comment',
          '*/',
          ...TEST_REQUEST_3.text.split('\n'),
        ]
      );
      const expectedResult =
        'GET _search\n{\n  "query": {\n    "match_all": {}\n  }\n}\n\n// test comment\nGET _all\n\n/*\n some comment\n*/\nPOST /_bulk\n{\n  "index": {\n    "_index": "books"\n  }\n}\n{\n  "name": "1984"\n}';

      expect(formattedData).toBe(expectedResult);
    });

    it('does not auto-indent a request with comments', () => {
      const formattedData = getAutoIndentedRequests(
        [TEST_REQUEST_4],
        [...TEST_REQUEST_4.text.split('\n')]
      );
      const expectedResult = TEST_REQUEST_4.text;
      expect(formattedData).toBe(expectedResult);
    });
  });
});
