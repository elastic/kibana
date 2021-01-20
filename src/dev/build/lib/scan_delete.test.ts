/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { readdirSync } from 'fs';
import { relative, resolve } from 'path';

import del from 'del';

// @ts-ignore
import { mkdirp, write } from './fs';
import { scanDelete } from './scan_delete';

const TMP = resolve(__dirname, '__tests__/__tmp__');

// clean and recreate TMP directory
beforeEach(async () => {
  await del(TMP);
  await mkdirp(resolve(TMP, 'foo/bar/baz'));
  await mkdirp(resolve(TMP, 'foo/bar/box'));
  await mkdirp(resolve(TMP, 'a/b/c/d/e'));
  await write(resolve(TMP, 'a/bar'), 'foo');
});

// cleanup TMP directory
afterAll(async () => {
  await del(TMP);
});

it('requires absolute paths', async () => {
  await expect(
    scanDelete({
      directory: relative(process.cwd(), TMP),
      regularExpressions: [],
    })
  ).rejects.toMatchInlineSnapshot(
    `[TypeError: Please use absolute paths to keep things explicit. You probably want to use \`build.resolvePath()\` or \`config.resolveFromRepo()\`.]`
  );

  await expect(
    scanDelete({
      directory: TMP,
      regularExpressions: [],
      excludePaths: ['foo'],
    })
  ).rejects.toMatchInlineSnapshot(
    `[TypeError: Please use absolute paths to keep things explicit. You probably want to use \`build.resolvePath()\` or \`config.resolveFromRepo()\`.]`
  );
});

it('deletes files/folders matching regular expression', async () => {
  await scanDelete({
    directory: TMP,
    regularExpressions: [/^.*[\/\\](bar|c)([\/\\]|$)/],
  });
  expect(readdirSync(resolve(TMP, 'foo'))).toEqual([]);
  expect(readdirSync(resolve(TMP, 'a'))).toEqual(['b']);
  expect(readdirSync(resolve(TMP, 'a/b'))).toEqual([]);
});

it('exludes directories mentioned in excludePaths', async () => {
  await scanDelete({
    directory: TMP,
    regularExpressions: [/^.*[\/\\](bar|c)([\/\\]|$)/],
    excludePaths: [resolve(TMP, 'foo')],
  });
  expect(readdirSync(resolve(TMP, 'foo'))).toEqual(['bar']);
  expect(readdirSync(resolve(TMP, 'a'))).toEqual(['b']);
  expect(readdirSync(resolve(TMP, 'a/b'))).toEqual([]);
});

it('exludes files mentioned in excludePaths', async () => {
  await scanDelete({
    directory: TMP,
    regularExpressions: [/box/],
    excludePaths: [resolve(TMP, 'foo/bar/box')],
  });

  expect(readdirSync(resolve(TMP, 'foo/bar'))).toEqual(['baz', 'box']);
});
