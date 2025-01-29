/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { decorateQuery } from './decorate_query';

describe('Query decorator', () => {
  test('should be a function', () => {
    expect(typeof decorateQuery).toBe('function');
  });

  test('should merge in the query string options', () => {
    const decoratedQuery = decorateQuery(
      { query_string: { query: '*' } },
      { analyze_wildcard: true }
    );

    expect(decoratedQuery).toEqual({ query_string: { query: '*', analyze_wildcard: true } });
  });

  test('should merge in serialized query string options', () => {
    const queryStringOptions = '{ "analyze_wildcard": true }';
    const decoratedQuery = decorateQuery({ query_string: { query: '*' } }, queryStringOptions);

    expect(decoratedQuery).toEqual({ query_string: { query: '*', analyze_wildcard: true } });
  });

  test('should add a default of a time_zone parameter if one is provided', () => {
    const decoratedQuery = decorateQuery(
      { query_string: { query: '*' } },
      { analyze_wildcard: true },
      'America/Phoenix'
    );
    expect(decoratedQuery).toEqual({
      query_string: { query: '*', analyze_wildcard: true, time_zone: 'America/Phoenix' },
    });
  });
});
