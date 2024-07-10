/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getEarliestLatestParams } from './run_query';

describe('getEarliestLatestParams', () => {
  it('should return an empty array if there are no time params', () => {
    const time = { from: 'now-15m', to: 'now' };
    const query = 'FROM foo';
    const params = getEarliestLatestParams(query, time);
    expect(params).toEqual([]);
  });

  it('should return an array with the earliest param if exists at the query', () => {
    const time = { from: 'Jul 5, 2024 @ 08:03:56.849', to: 'Jul 5, 2024 @ 10:03:56.849' };
    const query = 'FROM foo | where time > ?earliest';
    const params = getEarliestLatestParams(query, time);
    expect(params).toHaveLength(1);
    expect(params[0]).toHaveProperty('earliest');
  });

  it('should return an array with the latest param if exists at the query', () => {
    const time = { from: 'Jul 5, 2024 @ 08:03:56.849', to: 'Jul 5, 2024 @ 10:03:56.849' };
    const query = 'FROM foo | where time < ?latest';
    const params = getEarliestLatestParams(query, time);
    expect(params).toHaveLength(1);
    expect(params[0]).toHaveProperty('latest');
  });

  it('should return an array with the latest and earliest params if exist at the query', () => {
    const time = { from: 'Jul 5, 2024 @ 08:03:56.849', to: 'Jul 5, 2024 @ 10:03:56.849' };
    const query = 'FROM foo | where time < ?latest amd time > ?earliest';
    const params = getEarliestLatestParams(query, time);
    expect(params).toHaveLength(2);
    expect(params[0]).toHaveProperty('earliest');
    expect(params[1]).toHaveProperty('latest');
  });
});
