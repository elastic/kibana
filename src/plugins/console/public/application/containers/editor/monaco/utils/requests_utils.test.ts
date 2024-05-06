/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
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
        data: [JSON.stringify({ '${variable1}': '${variable2}' }, null, 2)],
      };
      it('works with several variables', () => {
        const result = replaceRequestVariables(request, variables);
        expect(result.data[0]).toBe(JSON.stringify({ test1: 'test2' }, null, 2));
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
});
