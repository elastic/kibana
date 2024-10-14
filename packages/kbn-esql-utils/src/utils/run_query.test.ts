/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStartEndParams } from './run_query';

describe('getStartEndParams', () => {
  it('should return an empty array if there are no time params', () => {
    const time = { from: 'now-15m', to: 'now' };
    const query = 'FROM foo';
    const params = getStartEndParams(query, time);
    expect(params).toEqual([]);
  });

  it('should return an array with the start param if exists at the query', () => {
    const time = { from: 'Jul 5, 2024 @ 08:03:56.849', to: 'Jul 5, 2024 @ 10:03:56.849' };
    const query = 'FROM foo | where time > ?_tstart';
    const params = getStartEndParams(query, time);
    expect(params).toHaveLength(1);
    expect(params[0]).toHaveProperty('_tstart');
  });

  it('should return an array with the end param if exists at the query', () => {
    const time = { from: 'Jul 5, 2024 @ 08:03:56.849', to: 'Jul 5, 2024 @ 10:03:56.849' };
    const query = 'FROM foo | where time < ?_tend';
    const params = getStartEndParams(query, time);
    expect(params).toHaveLength(1);
    expect(params[0]).toHaveProperty('_tend');
  });

  it('should return an array with the end and start params if exist at the query', () => {
    const time = { from: 'Jul 5, 2024 @ 08:03:56.849', to: 'Jul 5, 2024 @ 10:03:56.849' };
    const query = 'FROM foo | where time < ?_tend amd time > ?_tstart';
    const params = getStartEndParams(query, time);
    expect(params).toHaveLength(2);
    expect(params[0]).toHaveProperty('_tstart');
    expect(params[1]).toHaveProperty('_tend');
  });
});
