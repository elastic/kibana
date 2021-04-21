/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getBody } from './value_suggestions_route';

describe('getBody', function () {
  it('should return expected body for lower case query', async function () {
    const body = await getBody(
      { timeout: 30, terminate_after: 100 },
      'user_agent.name',
      'chrome',
      []
    );

    expect(body).toEqual({
      aggs: {
        suggestions: {
          terms: {
            execution_hint: 'map',
            field: 'user_agent.name',
            include: '(chrome|Chrome).*',
            shard_size: 10,
          },
        },
      },
      query: {
        bool: {
          filter: [],
        },
      },
      size: 0,
      terminate_after: 100,
      timeout: 30,
    });
  });

  it('should return expected body for capital case query', async function () {
    const body = await getBody(
      { timeout: 30, terminate_after: 100 },
      'user_agent.name',
      'Chrome',
      []
    );

    expect(body).toEqual({
      aggs: {
        suggestions: {
          terms: {
            execution_hint: 'map',
            field: 'user_agent.name',
            include: '(Chrome|chrome).*',
            shard_size: 10,
          },
        },
      },
      query: {
        bool: {
          filter: [],
        },
      },
      size: 0,
      terminate_after: 100,
      timeout: 30,
    });
  });
});
