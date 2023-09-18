/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isErrorResponse, isCompleteResponse, isPartialResponse } from './utils';

describe('utils', () => {
  describe('isErrorResponse', () => {
    it('returns `true` if the response is undefined', () => {
      const isError = isErrorResponse();
      expect(isError).toBe(true);
    });

    it('returns `true` if the response is not running and partial', () => {
      const isError = isErrorResponse({
        isPartial: true,
        isRunning: false,
        rawResponse: {},
      });
      expect(isError).toBe(true);
    });

    it('returns `false` if the response is not running and partial and contains failure details', () => {
      const isError = isErrorResponse({
        isPartial: true,
        isRunning: false,
        rawResponse: {
          took: 7,
          timed_out: false,
          _shards: {
            total: 2,
            successful: 1,
            skipped: 0,
            failed: 1,
            failures: [
              {
                shard: 0,
                index: 'remote:tmp-00002',
                node: '9SNgMgppT2-6UHJNXwio3g',
                reason: {
                  type: 'script_exception',
                  reason: 'runtime error',
                  script_stack: [
                    'org.elasticsearch.server@8.10.0/org.elasticsearch.search.lookup.LeafDocLookup.getFactoryForDoc(LeafDocLookup.java:148)',
                    'org.elasticsearch.server@8.10.0/org.elasticsearch.search.lookup.LeafDocLookup.get(LeafDocLookup.java:191)',
                    'org.elasticsearch.server@8.10.0/org.elasticsearch.search.lookup.LeafDocLookup.get(LeafDocLookup.java:32)',
                    "doc['bar'].value < 10",
                    '    ^---- HERE',
                  ],
                  script: "doc['bar'].value < 10",
                  lang: 'painless',
                  position: {
                    offset: 4,
                    start: 0,
                    end: 21,
                  },
                  caused_by: {
                    type: 'illegal_argument_exception',
                    reason: 'No field found for [bar] in mapping',
                  },
                },
              },
            ],
          },
          _clusters: {
            total: 1,
            successful: 1,
            skipped: 0,
            details: {
              remote: {
                status: 'partial',
                indices: 'tmp-*',
                took: 3,
                timed_out: false,
                _shards: {
                  total: 2,
                  successful: 1,
                  skipped: 0,
                  failed: 1,
                },
                failures: [
                  {
                    shard: 0,
                    index: 'remote:tmp-00002',
                    node: '9SNgMgppT2-6UHJNXwio3g',
                    reason: {
                      type: 'script_exception',
                      reason: 'runtime error',
                      script_stack: [
                        'org.elasticsearch.server@8.10.0/org.elasticsearch.search.lookup.LeafDocLookup.getFactoryForDoc(LeafDocLookup.java:148)',
                        'org.elasticsearch.server@8.10.0/org.elasticsearch.search.lookup.LeafDocLookup.get(LeafDocLookup.java:191)',
                        'org.elasticsearch.server@8.10.0/org.elasticsearch.search.lookup.LeafDocLookup.get(LeafDocLookup.java:32)',
                        "doc['bar'].value < 10",
                        '    ^---- HERE',
                      ],
                      script: "doc['bar'].value < 10",
                      lang: 'painless',
                      position: {
                        offset: 4,
                        start: 0,
                        end: 21,
                      },
                      caused_by: {
                        type: 'illegal_argument_exception',
                        reason: 'No field found for [bar] in mapping',
                      },
                    },
                  },
                ],
              },
            },
          },
          hits: {
            total: {
              value: 1,
              relation: 'eq',
            },
            max_score: 0,
            hits: [
              {
                _index: 'remote:tmp-00001',
                _id: 'd8JNlYoBFqAcOBVnvdqx',
                _score: 0,
                _source: {
                  foo: 'bar',
                  bar: 1,
                },
              },
            ],
          },
        },
      });
      expect(isError).toBe(false);
    });

    it('returns `false` if the response is running and partial', () => {
      const isError = isErrorResponse({
        isPartial: true,
        isRunning: true,
        rawResponse: {},
      });
      expect(isError).toBe(false);
    });

    it('returns `false` if the response is complete', () => {
      const isError = isErrorResponse({
        isPartial: false,
        isRunning: false,
        rawResponse: {},
      });
      expect(isError).toBe(false);
    });
  });

  describe('isCompleteResponse', () => {
    it('returns `false` if the response is undefined', () => {
      const isError = isCompleteResponse();
      expect(isError).toBe(false);
    });

    it('returns `false` if the response is running and partial', () => {
      const isError = isCompleteResponse({
        isPartial: true,
        isRunning: true,
        rawResponse: {},
      });
      expect(isError).toBe(false);
    });

    it('returns `true` if the response is complete', () => {
      const isError = isCompleteResponse({
        isPartial: false,
        isRunning: false,
        rawResponse: {},
      });
      expect(isError).toBe(true);
    });

    it('returns `true` if the response does not indicate isRunning', () => {
      const isError = isCompleteResponse({
        rawResponse: {},
      });
      expect(isError).toBe(true);
    });
  });

  describe('isPartialResponse', () => {
    it('returns `false` if the response is undefined', () => {
      const isError = isPartialResponse();
      expect(isError).toBe(false);
    });

    it('returns `true` if the response is running and partial', () => {
      const isError = isPartialResponse({
        isPartial: true,
        isRunning: true,
        rawResponse: {},
      });
      expect(isError).toBe(true);
    });

    it('returns `false` if the response is complete', () => {
      const isError = isPartialResponse({
        isPartial: false,
        isRunning: false,
        rawResponse: {},
      });
      expect(isError).toBe(false);
    });
  });
});
