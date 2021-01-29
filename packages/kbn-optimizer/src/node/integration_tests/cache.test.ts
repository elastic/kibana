/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Path from 'path';
import { Writable } from 'stream';

import del from 'del';

import { Cache } from '../cache';

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

const instances: Cache[] = [];
const makeCache = (...options: ConstructorParameters<typeof Cache>) => {
  const instance = new Cache(...options);
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
    prefix: 'foo',
    log,
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
    "MISS   [mtimes]   foo/foo/bar.js
    MISS   [codes]   foo/foo/bar.js
    MISS   [sourceMaps]   foo/foo/bar.js
    PUT   [atimes]   foo/foo/bar.js
    PUT   [mtimes]   foo/foo/bar.js
    PUT   [codes]   foo/foo/bar.js
    PUT   [sourceMaps]   foo/foo/bar.js
    HIT   [mtimes]   foo/foo/bar.js
    HIT   [codes]   foo/foo/bar.js
    HIT   [sourceMaps]   foo/foo/bar.js
    "
  `);
});
