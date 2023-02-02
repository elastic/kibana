/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { Writable } from 'stream';

import del from 'del';

import { LmdbCache } from './lmdb_cache';

const DIR = Path.resolve(__dirname, '../__tmp__/cache');

const makeTestLog = () => {
  const log = Object.assign(
    new Writable({
      write(chunk, enc, cb) {
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

const instances: LmdbCache[] = [];
const makeCache = (...options: ConstructorParameters<typeof LmdbCache>) => {
  const instance = new LmdbCache(...options);
  instances.push(instance);
  return instance;
};

beforeEach(async () => await del(DIR));
afterEach(async () => {
  await del(DIR);
  for (const instance of instances) {
    instance.close();
  }
  instances.length = 0;
});

it('returns undefined until values are set', async () => {
  const path = '/foo/bar.js';
  const mtime = new Date().toJSON();
  const log = makeTestLog();
  const cache = makeCache({
    dir: DIR,
    prefix: 'prefix',
    log,
    pathRoot: '/foo/',
  });

  expect(cache.getMtime(path)).toBe(undefined);
  expect(cache.getCode(path)).toBe(undefined);
  expect(cache.getSourceMap(path)).toBe(undefined);

  await cache.update(path, {
    mtime,
    code: 'var x = 1',
    map: { foo: 'bar' },
  });

  expect(cache.getMtime(path)).toBe(mtime);
  expect(cache.getCode(path)).toBe('var x = 1');
  expect(cache.getSourceMap(path)).toEqual({ foo: 'bar' });
  expect(log.output).toMatchInlineSnapshot(`
    "MISS   [mtimes]   prefix:bar.js
    MISS   [codes]   prefix:bar.js
    MISS   [sourceMaps]   prefix:bar.js
    PUT   [atimes]   prefix:bar.js
    PUT   [mtimes]   prefix:bar.js
    PUT   [codes]   prefix:bar.js
    PUT   [sourceMaps]   prefix:bar.js
    HIT   [mtimes]   prefix:bar.js
    HIT   [codes]   prefix:bar.js
    PUT   [atimes]   prefix:bar.js
    HIT   [sourceMaps]   prefix:bar.js
    "
  `);
});
