/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';

import del from 'del';

import { FsCache } from './fs_cache';

const DIR = Path.resolve(__dirname, '../__tmp__/fs_cache');
const DAY = 1000 * 60 * 60 * 24;

const makeCache = () => new FsCache({ dir: DIR, prefix: 'prefix' });

const makeTestFile = (name: string, source: string) => {
  const path = Path.resolve(DIR, 'files', name);
  Fs.mkdirSync(Path.dirname(path), { recursive: true });
  Fs.writeFileSync(path, source);
  return path;
};

const listEntryFiles = () => {
  const base = Path.resolve(DIR, 'fs1');
  const files: string[] = [];
  for (const subdir of Fs.readdirSync(base, { withFileTypes: true })) {
    if (subdir.isDirectory()) {
      for (const name of Fs.readdirSync(Path.resolve(base, subdir.name))) {
        files.push(Path.resolve(base, subdir.name, name));
      }
    }
  }
  return files;
};

beforeEach(async () => {
  await del(DIR);
});

afterAll(async () => {
  await del(DIR);
});

it('roundtrips code and source maps', async () => {
  const cache = makeCache();
  const path = makeTestFile('a.ts', 'const a = 1;');
  const key = cache.getKey(path, 'const a = 1;');

  expect(cache.getCode(key)).toBeUndefined();
  expect(cache.getSourceMap(key)).toBeUndefined();

  await cache.update(key, { code: 'var a = 1;', map: { version: 3 } });

  expect(cache.getCode(key)).toBe('var a = 1;');
  expect(cache.getSourceMap(key)).toEqual({ version: 3 });

  // entries are readable from a fresh instance pointing at the same dir
  const other = makeCache();
  expect(other.getCode(key)).toBe('var a = 1;');
});

it('stores entries without a map', async () => {
  const cache = makeCache();
  const key = cache.getKey(Path.resolve(DIR, 'missing.ts'), 'source');

  await cache.update(key, { code: 'code', map: null });

  expect(cache.getCode(key)).toBe('code');
  expect(cache.getSourceMap(key)).toBeUndefined();
});

it('uses a stat-based key for existing files and a hash key otherwise', () => {
  const cache = makeCache();
  const path = makeTestFile('b.ts', 'const b = 2;');

  expect(cache.getKey(path, 'const b = 2;')).toContain(':stat:');
  expect(cache.getKey(Path.resolve(DIR, 'does-not-exist.ts'), 'src')).toMatch(
    /^prefix:[0-9a-f]{64}$/
  );
});

it('produces distinct entries for distinct keys', async () => {
  const cache = makeCache();

  await cache.update('key-one', { code: 'one' });
  await cache.update('key-two', { code: 'two' });

  expect(cache.getCode('key-one')).toBe('one');
  expect(cache.getCode('key-two')).toBe('two');
});

it('prunes entries older than the age limit', async () => {
  const cache = makeCache();
  await cache.pruneComplete;
  await cache.update('old-key', { code: 'old' });
  await cache.update('fresh-key', { code: 'fresh' });

  const old = new Date(Date.now() - 45 * DAY);
  for (const file of listEntryFiles()) {
    if (Fs.readFileSync(file, 'utf8') === 'old') {
      Fs.utimesSync(file, old, old);
    }
  }
  // age the prune marker so the next instance sweeps again
  Fs.utimesSync(Path.resolve(DIR, 'fs1', 'last-clean'), old, old);

  const next = makeCache();
  await next.pruneComplete;

  expect(next.getCode('old-key')).toBeUndefined();
  expect(next.getCode('fresh-key')).toBe('fresh');
});
