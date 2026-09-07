/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricsTracker } from '../../../../../types';
import { getCurlRequest, replaceRequestVariables, trackSentRequests } from './request_actions';

describe('request_actions', () => {
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

      it('replaces a variable with a prefix', () => {
        const result = replaceRequestVariables(
          { ...request, data: [JSON.stringify({ key: 'frozen_${variable1}' }, null, 2)] },
          variables
        );
        expect(JSON.parse(result.data[0])).toMatchObject({ key: 'frozen_test1' });
      });

      it('replaces a variable with a suffix', () => {
        const result = replaceRequestVariables(
          { ...request, data: [JSON.stringify({ key: '${variable1}_suffix' }, null, 2)] },
          variables
        );
        expect(JSON.parse(result.data[0])).toMatchObject({ key: 'test1_suffix' });
      });

      it('replaces whole-value and inline occurrences of the same variable', () => {
        const result = replaceRequestVariables(
          {
            ...request,
            data: [
              JSON.stringify(
                { index: '${variable1}', renamed_index: 'frozen_${variable1}' },
                null,
                2
              ),
            ],
          },
          variables
        );
        expect(JSON.parse(result.data[0])).toMatchObject({
          index: 'test1',
          renamed_index: 'frozen_test1',
        });
      });

      it('preserves JSON type coercion when variable is the whole value', () => {
        const result = replaceRequestVariables(
          { ...request, data: [JSON.stringify({ query: '${variable3}' }, null, 2)] },
          variables
        );
        expect(JSON.parse(result.data[0])).toMatchObject({ query: { match_all: {} } });
      });

      it('replaces a variable inline inside a JSON key', () => {
        const result = replaceRequestVariables(
          { ...request, data: [`{\n  "match_\${variable1}": {}\n}`] },
          variables
        );
        expect(JSON.parse(result.data[0])).toMatchObject({ match_test1: {} });
      });

      it('replaces an empty-string variable value with an empty JSON string', () => {
        const emptyVar = [{ id: '4', name: 'empty', value: '' }];
        const result = replaceRequestVariables(
          { ...request, data: [JSON.stringify({ key: '${empty}' }, null, 2)] },
          emptyVar
        );
        expect(JSON.parse(result.data[0])).toMatchObject({ key: '' });
      });

      it('leaves the placeholder when the variable is not defined', () => {
        const result = replaceRequestVariables(
          { ...request, data: [JSON.stringify({ key: '${undefined_var}' }, null, 2)] },
          variables
        );
        expect(result.data[0]).toContain('${undefined_var}');
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
