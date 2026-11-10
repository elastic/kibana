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
import { Writable } from 'stream';
import { DatabaseSync } from 'node:sqlite';

import del from 'del';

import { SqliteCache } from './sqlite_cache';

const DIR = Path.resolve(__dirname, '../__tmp__/cache');
const DB_FILE = Path.resolve(DIR, 'v3.sqlite');
const DAY = 1000 * 60 * 60 * 24;
const GLOBAL_ATIME = new Date().setHours(0, 0, 0, 0);

const makeTestFile = (name: string, source: string) => {
  const path = Path.resolve(DIR, name);
  Fs.mkdirSync(Path.dirname(path), { recursive: true });
  Fs.writeFileSync(path, source);
  return path;
};

const getExpectedMetadataKey = (path: string) => {
  const stat = Fs.statSync(path, { bigint: true });
  const keyParts = [stat.dev, stat.ino, stat.mode, stat.size, stat.mtimeNs, stat.ctimeNs].map(
    (value) => value.toString()
  );

  return `prefix:stat:${keyParts.join(':')}:${Path.resolve(path)}`;
};

const readRow = (key: string) => {
  const db = new DatabaseSync(DB_FILE);
  try {
    return db.prepare('SELECT atime, code, map FROM cache WHERE key = ?').get(key);
  } finally {
    db.close();
  }
};

const writeRows = (rows: Array<[key: string, atime: number, code: string, map: string | null]>) => {
  const db = new DatabaseSync(DB_FILE);
  try {
    const put = db.prepare(
      'INSERT OR REPLACE INTO cache (key, atime, code, map) VALUES (?, ?, ?, ?)'
    );
    for (const row of rows) {
      put.run(...row);
    }
  } finally {
    db.close();
  }
};

const makeTestLog = () => {
  const log = Object.assign(
    new Writable({
      write(chunk, _, cb) {
        log.output += chunk;
        cb();
      },
    }),
    {
      output: '',
    }
  );

  return log;
};

const caches: SqliteCache[] = [];

const makeCache = (...options: ConstructorParameters<typeof SqliteCache>) => {
  const cache = new SqliteCache(...options);
  caches.push(cache);
  return cache;
};

beforeEach(async () => await del(DIR));
afterEach(async () => {
  await Promise.all(caches.splice(0).map((cache) => cache.close()));
  await del(DIR);
});

it('returns undefined until values are set', async () => {
  const path = '/foo/bar.js';
  const source = `console.log("hi, hello")`;
  const log = makeTestLog();
  const cache = makeCache({
    dir: DIR,
    prefix: 'prefix',
    log,
  });

  const key = cache.getKey(path, source);
  expect(key).toBe('prefix:1bfb4256d4a036a897e0582a67bb23417da30bf3975c7e59da5d5a211a6ce74b');
  expect(cache.getCode(key)).toBe(undefined);
  expect(cache.getSourceMap(key)).toBe(undefined);

  await cache.update(key, {
    code: 'var x = 1',
    map: { foo: 'bar' },
  });

  expect(cache.getCode(key)).toBe('var x = 1');
  expect(cache.getSourceMap(key)).toEqual({ foo: 'bar' });
  expect(log.output).toMatchInlineSnapshot(`
    "MISS code   prefix:1bfb4256d4a036a897e0582a67bb23417da30bf3975c7e59da5d5a211a6ce74b
    MISS map   prefix:1bfb4256d4a036a897e0582a67bb23417da30bf3975c7e59da5d5a211a6ce74b
    PUT   prefix:1bfb4256d4a036a897e0582a67bb23417da30bf3975c7e59da5d5a211a6ce74b
    HIT code   prefix:1bfb4256d4a036a897e0582a67bb23417da30bf3975c7e59da5d5a211a6ce74b
    HIT map   prefix:1bfb4256d4a036a897e0582a67bb23417da30bf3975c7e59da5d5a211a6ce74b
    "
  `);
});

it('uses file metadata for cache keys when available', () => {
  const source = `console.log("hi, hello")`;
  const path = makeTestFile('metadata.js', source);
  const cache = makeCache({
    dir: DIR,
    prefix: 'prefix',
  });

  expect(cache.getKey(path, source)).toBe(getExpectedMetadataKey(path));
});

it('changes metadata cache keys when file metadata changes', () => {
  const source = `console.log("before")`;
  const path = makeTestFile('changed.js', source);
  const cache = makeCache({
    dir: DIR,
    prefix: 'prefix',
  });

  const initialKey = cache.getKey(path, source);
  const updatedSource = `${source}\nconsole.log("after")`;
  Fs.writeFileSync(path, updatedSource);

  expect(cache.getKey(path, updatedSource)).toBe(getExpectedMetadataKey(path));
  expect(cache.getKey(path, updatedSource)).not.toBe(initialKey);
});

it('stores code, atime and source map in one row', async () => {
  const cache = makeCache({
    dir: DIR,
    prefix: 'prefix',
  });
  const key = cache.getKey('/foo/bar.js', 'source');

  await cache.update(key, {
    code: 'var x = 1',
    map: { foo: 'bar' },
  });

  expect(readRow(key)).toEqual({ atime: GLOBAL_ATIME, code: 'var x = 1', map: '{"foo":"bar"}' });
});

it('supports UTF-8 cache keys', async () => {
  const cache = makeCache({
    dir: DIR,
    prefix: 'prefix',
  });
  const key = 'prefix:日本語:🚀';

  await cache.update(key, {
    code: 'var utf8 = true',
  });
  await cache.close();

  expect(readRow(key)).toMatchObject({ code: 'var utf8 = true' });
});

it('does not write source maps for transforms without source maps', async () => {
  const cache = makeCache({
    dir: DIR,
    prefix: 'prefix',
  });
  const key = cache.getKey('/foo/bar.yaml', 'foo: bar');

  await cache.update(key, {
    code: 'module.exports = "foo: bar";',
  });

  expect(cache.getCode(key)).toBe('module.exports = "foo: bar";');
  expect(cache.getSourceMap(key)).toBe(undefined);
  expect(readRow(key)).toMatchObject({ map: null });
});

it('drains pending writes on explicit close', async () => {
  const cache = makeCache({
    dir: DIR,
    prefix: 'prefix',
  });
  const key = cache.getKey('/foo/pending.js', 'source');

  void cache.update(key, {
    code: 'var pending = true',
    map: { pending: true },
  });

  await cache.close();

  expect(readRow(key)).toEqual({
    atime: GLOBAL_ATIME,
    code: 'var pending = true',
    map: '{"pending":true}',
  });
});

it('drains pending writes when the process exits', () => {
  const cache = makeCache({
    dir: DIR,
    prefix: 'prefix',
  });
  const key = cache.getKey('/foo/exit.js', 'source');

  void cache.update(key, { code: 'var exited = true' });
  process.emit('exit', 0);

  expect(readRow(key)).toMatchObject({ code: 'var exited = true' });
});

it('shares entries between instances using the same directory', async () => {
  const writer = makeCache({ dir: DIR, prefix: 'prefix' });
  const reader = makeCache({ dir: DIR, prefix: 'prefix' });

  await writer.update('shared', { code: 'var shared = true' });

  expect(reader.getCode('shared')).toBe('var shared = true');
});

it('only refreshes atime for entries older than the refresh interval', async () => {
  const log = makeTestLog();
  const cache = makeCache({
    dir: DIR,
    prefix: 'prefix',
    log,
  });
  const freshKey = cache.getKey('/foo/fresh.js', 'source');
  const staleKey = cache.getKey('/foo/stale.js', 'source');

  writeRows([
    [freshKey, GLOBAL_ATIME - 6 * DAY, 'fresh', null],
    [staleKey, GLOBAL_ATIME - 8 * DAY, 'stale', null],
  ]);

  log.output = '';
  expect(cache.getCode(freshKey)).toBe('fresh');
  expect(cache.getCode(staleKey)).toBe('stale');

  await cache.close();

  expect(log.output).toBe(`HIT code   ${freshKey}\nHIT code   ${staleKey}\nPUT   ${staleKey}\n`);
  expect(readRow(freshKey)).toMatchObject({ atime: GLOBAL_ATIME - 6 * DAY });
  expect(readRow(staleKey)).toMatchObject({ atime: GLOBAL_ATIME });
});

it('prunes stale entries when the last prune is older than a week', async () => {
  await makeCache({ dir: DIR, prefix: 'prefix' }).close();
  writeRows([
    ['old', GLOBAL_ATIME - 31 * DAY, 'old', '{"old":true}'],
    ['fresh', GLOBAL_ATIME - 1 * DAY, 'fresh', '{"fresh":true}'],
  ]);

  await makeCache({ dir: DIR, prefix: 'prefix' }).close();
  expect(readRow('old')).toMatchObject({ code: 'old' });

  const db = new DatabaseSync(DB_FILE);
  db.prepare("UPDATE meta SET value = ? WHERE key = 'lastPrune'").run(GLOBAL_ATIME - 8 * DAY);
  db.close();

  await makeCache({ dir: DIR, prefix: 'prefix' }).close();
  expect(readRow('old')).toBe(undefined);
  expect(readRow('fresh')).toMatchObject({ code: 'fresh' });
});
