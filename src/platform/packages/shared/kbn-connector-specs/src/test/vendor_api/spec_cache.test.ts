/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type { SpecCacheOptions } from './spec_cache';
import { createSpecCache } from './spec_cache';

const URL_A = 'https://specs.example.com/a.yaml';

describe('createSpecCache', () => {
  let directory: string;
  let fetches: string[];
  let version: number;
  let time: string;

  const cache = (options: Partial<SpecCacheOptions> = {}) =>
    createSpecCache({
      directory,
      fetchText: async (url) => {
        fetches.push(url);
        return `${url} v${version}`;
      },
      now: () => new Date(time),
      log: { info: () => {} },
      ...options,
    });

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'spec-cache-'));
    fetches = [];
    version = 1;
    time = '2026-10-01T00:00:00.000Z';
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it('fetches a URL once and serves it from the cache afterwards, across runs', async () => {
    await cache().fetchText(URL_A);
    version = 2;
    time = '2026-10-08T00:00:00.000Z';

    const later = cache();
    expect(await later.fetchText(URL_A)).toBe(`${URL_A} v1`);
    expect(later.fetchedAt(URL_A)).toEqual(new Date('2026-10-01T00:00:00.000Z'));
    expect(fetches).toEqual([URL_A]);
  });

  it('fetches every URL again once with refresh', async () => {
    await cache().fetchText(URL_A);
    version = 2;
    time = '2026-10-08T00:00:00.000Z';

    const refreshed = cache({ refresh: true });
    expect(await refreshed.fetchText(URL_A)).toBe(`${URL_A} v2`);
    expect(await refreshed.fetchText(URL_A)).toBe(`${URL_A} v2`);
    expect(refreshed.fetchedAt(URL_A)).toEqual(new Date('2026-10-08T00:00:00.000Z'));
    expect(fetches).toEqual([URL_A, URL_A]);
    expect(await cache().fetchText(URL_A)).toBe(`${URL_A} v2`);
  });

  it('knows no fetch time for URLs it has not served', () => {
    expect(cache().fetchedAt(URL_A)).toBeUndefined();
  });
});
