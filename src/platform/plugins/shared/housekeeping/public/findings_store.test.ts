/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { HousekeepingFindingsResponse } from '../common';
import { FINDINGS_CACHE_TTL_MS, FindingsStore } from './findings_store';

const response: HousekeepingFindingsResponse = {
  kinds: [],
  groups: [],
  summary: { broken_reference: 0, deprecation: 0, risk: 0, unused: 0 },
  skipped: [],
  resourceTypes: {},
};

describe('FindingsStore', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let store: FindingsStore;
  let now: number;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
    http.get.mockResolvedValue(response);
    store = new FindingsStore(http);
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reuses the last run of a scope until it expires', async () => {
    await store.load({ resourceTypes: ['index'] });
    now += FINDINGS_CACHE_TTL_MS - 1;
    await store.load({ resourceTypes: ['index'] });
    expect(http.get).toHaveBeenCalledTimes(1);

    now += 1;
    await store.load({ resourceTypes: ['index'] });
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('keeps one cache per scope, whatever the order of its types', async () => {
    await store.load({ resourceTypes: ['index', 'data_stream'] });
    await store.load({ resourceTypes: ['data_stream', 'index'] });
    await store.load({ resourceTypes: ['index'] });
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('does not send a second request while one is running for the scope', async () => {
    const first = store.load();
    const second = store.load({ resourceTypes: [] });
    await Promise.all([first, second]);
    expect(http.get).toHaveBeenCalledTimes(1);
    expect(store.getState().response).toBe(response);
  });

  it('runs again when forced, even before the run expires', async () => {
    await store.load();
    await store.load(undefined, { force: true });
    expect(http.get).toHaveBeenCalledTimes(2);
  });
});
