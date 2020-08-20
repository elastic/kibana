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

import del from 'del';
import execa from 'execa';
import { REPO_ROOT, createAbsolutePathSerializer } from '@kbn/dev-utils';
import globby from 'globby';

const GENERATED_DIR = Path.resolve(REPO_ROOT, `plugins`);

expect.addSnapshotSerializer(createAbsolutePathSerializer());

beforeEach(async () => {
  await del(GENERATED_DIR, { force: true });
});

afterEach(async () => {
  await del(GENERATED_DIR, { force: true });
});

it('generates a plugin', async () => {
  await execa(process.execPath, ['scripts/generate_plugin.js', '-y', '--name=foo'], {
    cwd: REPO_ROOT,
    buffer: true,
  });

  const paths = await globby('**/*', {
    cwd: GENERATED_DIR,
    absolute: true,
    dot: true,
    onlyFiles: true,
    ignore: ['**/.git'],
  });

  expect(paths.sort((a, b) => a.localeCompare(b))).toMatchInlineSnapshot(`
    Array [
      <absolute path>/plugins/foo/.eslintrc.js,
      <absolute path>/plugins/foo/.gitignore,
      <absolute path>/plugins/foo/.i18nrc.json,
      <absolute path>/plugins/foo/common/index.ts,
      <absolute path>/plugins/foo/kibana.json,
      <absolute path>/plugins/foo/package.json,
      <absolute path>/plugins/foo/public/application.tsx,
      <absolute path>/plugins/foo/public/components/app.tsx,
      <absolute path>/plugins/foo/public/index.scss,
      <absolute path>/plugins/foo/public/index.ts,
      <absolute path>/plugins/foo/public/plugin.ts,
      <absolute path>/plugins/foo/public/types.ts,
      <absolute path>/plugins/foo/README.md,
      <absolute path>/plugins/foo/server/index.ts,
      <absolute path>/plugins/foo/server/plugin.ts,
      <absolute path>/plugins/foo/server/routes/index.ts,
      <absolute path>/plugins/foo/server/types.ts,
      <absolute path>/plugins/foo/translations/ja-JP.json,
      <absolute path>/plugins/foo/tsconfig.json,
    ]
  `);
});

it('generates a plugin without UI', async () => {
  await execa(process.execPath, ['scripts/generate_plugin.js', '--name=bar', '-y', '--no-ui'], {
    cwd: REPO_ROOT,
    buffer: true,
  });

  const paths = await globby('**/*', {
    cwd: GENERATED_DIR,
    absolute: true,
    dot: true,
    onlyFiles: true,
    ignore: ['**/.git'],
  });

  expect(paths.sort((a, b) => a.localeCompare(b))).toMatchInlineSnapshot(`
    Array [
      <absolute path>/plugins/bar/.eslintrc.js,
      <absolute path>/plugins/bar/.gitignore,
      <absolute path>/plugins/bar/.i18nrc.json,
      <absolute path>/plugins/bar/common/index.ts,
      <absolute path>/plugins/bar/kibana.json,
      <absolute path>/plugins/bar/package.json,
      <absolute path>/plugins/bar/README.md,
      <absolute path>/plugins/bar/server/index.ts,
      <absolute path>/plugins/bar/server/plugin.ts,
      <absolute path>/plugins/bar/server/routes/index.ts,
      <absolute path>/plugins/bar/server/types.ts,
      <absolute path>/plugins/bar/tsconfig.json,
    ]
  `);
});

it('generates a plugin without server plugin', async () => {
  await execa(process.execPath, ['scripts/generate_plugin.js', '--name=baz', '-y', '--no-server'], {
    cwd: REPO_ROOT,
    buffer: true,
  });

  const paths = await globby('**/*', {
    cwd: GENERATED_DIR,
    absolute: true,
    dot: true,
    onlyFiles: true,
    ignore: ['**/.git'],
  });

  expect(paths.sort((a, b) => a.localeCompare(b))).toMatchInlineSnapshot(`
    Array [
      <absolute path>/plugins/baz/.eslintrc.js,
      <absolute path>/plugins/baz/.gitignore,
      <absolute path>/plugins/baz/.i18nrc.json,
      <absolute path>/plugins/baz/common/index.ts,
      <absolute path>/plugins/baz/kibana.json,
      <absolute path>/plugins/baz/package.json,
      <absolute path>/plugins/baz/public/application.tsx,
      <absolute path>/plugins/baz/public/components/app.tsx,
      <absolute path>/plugins/baz/public/index.scss,
      <absolute path>/plugins/baz/public/index.ts,
      <absolute path>/plugins/baz/public/plugin.ts,
      <absolute path>/plugins/baz/public/types.ts,
      <absolute path>/plugins/baz/README.md,
      <absolute path>/plugins/baz/translations/ja-JP.json,
      <absolute path>/plugins/baz/tsconfig.json,
    ]
  `);
});
