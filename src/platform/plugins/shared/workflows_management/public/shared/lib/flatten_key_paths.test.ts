/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonObject } from '@kbn/utility-types';
import { flattenKeyPaths } from './flatten_key_paths';

describe('kibanaFlatten', () => {
  it('should flatten simple object', () => {
    const obj: JsonObject = { a: 1, b: { c: 2 } };
    const flattened = flattenKeyPaths(obj);
    expect(flattened).toEqual({ a: 1, 'b.c': 2 });
  });

  it('should flatten deeply nested objects', () => {
    const obj: JsonObject = { a: { b: { c: { d: 42 } } } };
    const flattened = flattenKeyPaths(obj);
    expect(flattened).toEqual({ 'a.b.c.d': 42 });
  });

  it('should flatten arrays by index', () => {
    const obj: JsonObject = { a: 1, b: [10, 20, 30] };
    const flattened = flattenKeyPaths(obj);
    expect(flattened).toEqual({ a: 1, 'b[0]': 10, 'b[1]': 20, 'b[2]': 30 });
  });

  it('should flatten arrays of objects by index', () => {
    const obj: JsonObject = { a: 1, b: [{ c: 2 }, { c: 3 }] };
    const flattened = flattenKeyPaths(obj);
    expect(flattened).toEqual({ a: 1, 'b[0].c': 2, 'b[1].c': 3 });
  });

  it('should handle mixed nested structures', () => {
    const obj: JsonObject = {
      user: {
        name: 'John',
        tags: ['admin', 'user'],
        profile: {
          age: 30,
        },
      },
    };
    const flattened = flattenKeyPaths(obj);
    expect(flattened).toEqual({
      'user.name': 'John',
      'user.tags[0]': 'admin',
      'user.tags[1]': 'user',
      'user.profile.age': 30,
    });
  });

  it('should handle primitive values', () => {
    const obj: JsonObject = {
      string: 'hello',
      number: 42,
      boolean: true,
      nullValue: null,
    };
    const flattened = flattenKeyPaths(obj);
    expect(flattened).toEqual({
      string: 'hello',
      number: 42,
      boolean: true,
      nullValue: null,
    });
  });

  it('should flatten an array as root', () => {
    const arr = [1, 2, { a: 3 }];
    const flattened = flattenKeyPaths(arr);
    expect(flattened).toEqual({ '[0]': 1, '[1]': 2, '[2].a': 3 });
  });

  it('should handle empty objects and arrays', () => {
    const obj: JsonObject = {
      emptyObj: {},
      emptyArray: [],
    };
    const flattened = flattenKeyPaths(obj);
    expect(flattened).toEqual({
      emptyObj: null,
      emptyArray: null,
    });
  });

  it('should handle empty array', () => {
    const obj: JsonObject = {
      emptyArray: [],
    };
    const flattened = flattenKeyPaths(obj);
    expect(flattened).toEqual({ emptyArray: null });
  });

  it('should handle empty object', () => {
    const obj: JsonObject = {
      emptyObj: {},
    };
    const flattened = flattenKeyPaths(obj);
    expect(flattened).toEqual({ emptyObj: null });
  });

  it('should handle complex real-world nested structure without crashing', () => {
    const obj: JsonObject = {
      conversation_id: 'ec0f801a-b95e-401e-a5d7-e7104fd7ae7b',
      response: {
        message:
          "Based on reviewing the available indices and data streams, I don't see any data specifically related to National Parks in your Elasticsearch cluster.",
      },
      steps: [
        {
          reasoning:
            'Searching for any content related to National Parks to determine if such data exists in the system',
          type: 'reasoning',
        },
        {
          tool_call_id: 'tooluse_SJX-EnrZQmyZQVfNgEuRAg',
          tool_id: 'platform.core.search',
          progression: [
            {
              message: 'Selecting the best target for this query',
            },
          ],
          type: 'tool_call',
          params: {
            query: 'National Park',
          },
          results: [
            {
              data: {
                message: 'Could not figure out which index to use',
              },
              tool_result_id: 'mWYrGu',
              type: 'error',
            },
          ],
        },
        {
          reasoning:
            'Since the search failed to find an appropriate index, checking available indices to see if any might contain National Park data',
          type: 'reasoning',
        },
        {
          tool_call_id: 'tooluse_mXGO0lmcQEGS7jBkhuDCYQ',
          tool_id: 'platform.core.list_indices',
          progression: [],
          type: 'tool_call',
          params: {},
          results: [
            {
              data: {
                indices: [
                  {
                    name: 'lookup_access_tracker',
                  },
                  {
                    name: 'lookup_asset_lookup_default_fields',
                  },
                ],
                aliases: [],
                warnings: [],
                data_streams: [
                  {
                    indices: [
                      '.ds-logs-endpoint.alerts-default-2025.01.28-000001',
                      '.ds-logs-endpoint.alerts-default-2025.02.28-000002',
                    ],
                    name: 'logs-endpoint.alerts-default',
                  },
                ],
              },
              tool_result_id: 'TagONT',
              type: 'other',
            },
          ],
        },
      ],
    };

    // Should not crash - just verify it completes without error
    const flattened = flattenKeyPaths(obj);

    // Verify some key paths exist
    expect(flattened.conversation_id).toBe('ec0f801a-b95e-401e-a5d7-e7104fd7ae7b');
    expect(flattened['response.message']).toContain('National Parks');
    expect(flattened['steps[0].reasoning']).toContain('Searching for any content');
    expect(flattened['steps[1].tool_id']).toBe('platform.core.search');
    expect(flattened['steps[1].progression[0].message']).toBe(
      'Selecting the best target for this query'
    );
    expect(flattened['steps[1].params.query']).toBe('National Park');
    expect(flattened['steps[1].results[0].data.message']).toBe(
      'Could not figure out which index to use'
    );
    expect(flattened['steps[3].results[0].data.indices[0].name']).toBe('lookup_access_tracker');
    expect(flattened['steps[3].results[0].data.data_streams[0].name']).toBe(
      'logs-endpoint.alerts-default'
    );
    expect(flattened['steps[3].results[0].data.data_streams[0].indices[0]']).toBe(
      '.ds-logs-endpoint.alerts-default-2025.01.28-000001'
    );
  });
});
