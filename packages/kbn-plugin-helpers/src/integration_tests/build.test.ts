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

import Path from 'path';

import execa from 'execa';
import { createRecursiveSerializer, createStripAnsiSerializer } from '@kbn/dev-utils';
import decompress from 'decompress';
import del from 'del';
import globby from 'globby';
import loadJsonFile from 'load-json-file';

const FIXTURE_DIR = Path.resolve(__dirname, '__fixtures__');
const TMP_DIR = Path.resolve(__dirname, '__tmp__');
const BASIC_UI_PLUGIN_DIR = Path.resolve(FIXTURE_DIR, 'foo');
const BASIC_UI_PLUGIN_BUILD_DIR = Path.resolve(BASIC_UI_PLUGIN_DIR, 'build');
const BASIC_UI_PLUGIN_ARCHIVE = Path.resolve(BASIC_UI_PLUGIN_BUILD_DIR, 'foo-7.5.0.zip');

const TIME_RE = /[\d\.]+ sec/g;

expect.addSnapshotSerializer(createStripAnsiSerializer());
expect.addSnapshotSerializer(
  createRecursiveSerializer(
    (s) => typeof s === 'string' && TIME_RE.test(s),
    (s) => s.replace(TIME_RE, '<time>')
  )
);

beforeEach(async () => await del(BASIC_UI_PLUGIN_BUILD_DIR));
afterEach(async () => await del(BASIC_UI_PLUGIN_BUILD_DIR));

it('builds the plugin into a viable archive', async () => {
  const proc = await execa(
    process.execPath,
    [require.resolve('../../../../scripts/plugin_helpers'), 'build', '--kibana-version', '7.5.0'],
    {
      cwd: BASIC_UI_PLUGIN_DIR,
    }
  );

  expect(proc.stdout).toMatchInlineSnapshot(`
    " info deleting the build and target directories
     info running @kbn/optimizer
     │ info initialized, 0 bundles cached
     │ info starting worker [1 bundle]
     │ succ 1 bundles compiled successfully after <time>
     info copying source into the build and converting with babel
     info compressing plugin into [foo-7.5.0.zip]"
  `);
  expect(proc.stderr).toMatchInlineSnapshot(`""`);

  await decompress(BASIC_UI_PLUGIN_ARCHIVE, TMP_DIR);

  const files = await globby(['**/*'], { cwd: TMP_DIR });
  files.sort((a, b) => a.localeCompare(b));

  expect(files).toMatchInlineSnapshot(`
    Array [
      "kibana/foo/kibana.json",
      "kibana/foo/target/public/foo.plugin.js",
      "kibana/foo/target/public/foo.plugin.js.br",
      "kibana/foo/target/public/foo.plugin.js.gz",
    ]
  `);

  expect(loadJsonFile.sync(Path.resolve(TMP_DIR, 'kibana/foo/kibana.json'))).toMatchInlineSnapshot(`
    Object {
      "id": "foo",
      "kibanaVersion": "7.5.0",
      "ui": true,
      "version": "1.0.0",
    }
  `);
});
