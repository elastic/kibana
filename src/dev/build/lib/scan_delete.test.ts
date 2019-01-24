/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

it('requires an absolute directory', async () => {
  await expect(
    scanDelete({
      directory: relative(process.cwd(), TMP),
      regularExpressions: [],
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
