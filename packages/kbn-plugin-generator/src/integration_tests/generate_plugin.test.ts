/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';

import del from 'del';
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import { createAbsolutePathSerializer } from '@kbn/jest-serializers';
import { globby } from 'globby';

const GENERATED_DIR = Path.resolve(REPO_ROOT, `plugins`);

expect.addSnapshotSerializer(createAbsolutePathSerializer());

beforeEach(async () => {
  await del(GENERATED_DIR, { force: true });
});

afterEach(async () => {
  await del(GENERATED_DIR, { force: true });
});

it('generates a classic plugin by default', async () => {
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

  const serverIndex = Fs.readFileSync(Path.resolve(GENERATED_DIR, 'foo/server/index.ts'), 'utf8');
  expect(serverIndex).toContain('export async function plugin');

  expect(Fs.existsSync(Path.resolve(GENERATED_DIR, 'foo/classic'))).toBe(false);
  expect(Fs.existsSync(Path.resolve(GENERATED_DIR, 'foo/di'))).toBe(false);
});

it('sets a default owner.name when generating with --yes', async () => {
  await execa(process.execPath, ['scripts/generate_plugin.js', '-y', '--name=foo'], {
    cwd: REPO_ROOT,
    buffer: true,
  });

  // --yes must produce a bootable external-plugin manifest (owner.name is required).
  const manifest = JSON.parse(
    Fs.readFileSync(Path.resolve(GENERATED_DIR, 'foo/kibana.json'), 'utf8')
  );
  expect(manifest.owner.name).toEqual('Plugin Author');
});

it('generates a classic plugin without UI', async () => {
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
      <absolute path>/plugins/bar/translations/ja-JP.json,
      <absolute path>/plugins/bar/tsconfig.json,
    ]
  `);
});

it('generates a classic plugin without server plugin', async () => {
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
      <absolute path>/plugins/baz/public/index.ts,
      <absolute path>/plugins/baz/public/plugin.ts,
      <absolute path>/plugins/baz/public/types.ts,
      <absolute path>/plugins/baz/README.md,
      <absolute path>/plugins/baz/translations/ja-JP.json,
      <absolute path>/plugins/baz/tsconfig.json,
    ]
  `);
});

it('generates a DI plugin with --di', async () => {
  await execa(process.execPath, ['scripts/generate_plugin.js', '-y', '--name=foo', '--di'], {
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
      <absolute path>/plugins/foo/public/components/app.tsx,
      <absolute path>/plugins/foo/public/index.ts,
      <absolute path>/plugins/foo/public/main.tsx,
      <absolute path>/plugins/foo/public/service.ts,
      <absolute path>/plugins/foo/README.md,
      <absolute path>/plugins/foo/server/example_service.ts,
      <absolute path>/plugins/foo/server/index.ts,
      <absolute path>/plugins/foo/server/route.ts,
      <absolute path>/plugins/foo/translations/ja-JP.json,
      <absolute path>/plugins/foo/tsconfig.json,
    ]
  `);

  const serverIndex = Fs.readFileSync(Path.resolve(GENERATED_DIR, 'foo/server/index.ts'), 'utf8');
  const publicIndex = Fs.readFileSync(Path.resolve(GENERATED_DIR, 'foo/public/index.ts'), 'utf8');
  const exampleService = Fs.readFileSync(
    Path.resolve(GENERATED_DIR, 'foo/server/example_service.ts'),
    'utf8'
  );
  expect(serverIndex).toContain('export { pluginModule as module }');
  expect(publicIndex).toContain('export const module');
  expect(exampleService).toContain('SavedObjectsClient');

  expect(Fs.existsSync(Path.resolve(GENERATED_DIR, 'foo/classic'))).toBe(false);
  expect(Fs.existsSync(Path.resolve(GENERATED_DIR, 'foo/di'))).toBe(false);
});

it('generates a DI plugin without UI', async () => {
  await execa(
    process.execPath,
    ['scripts/generate_plugin.js', '--name=bar', '-y', '--di', '--no-ui'],
    {
      cwd: REPO_ROOT,
      buffer: true,
    }
  );

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
      <absolute path>/plugins/bar/server/example_service.ts,
      <absolute path>/plugins/bar/server/index.ts,
      <absolute path>/plugins/bar/server/route.ts,
      <absolute path>/plugins/bar/translations/ja-JP.json,
      <absolute path>/plugins/bar/tsconfig.json,
    ]
  `);
});

it('generates a DI plugin without server plugin', async () => {
  await execa(
    process.execPath,
    ['scripts/generate_plugin.js', '--name=baz', '-y', '--di', '--no-server'],
    {
      cwd: REPO_ROOT,
      buffer: true,
    }
  );

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
      <absolute path>/plugins/baz/public/components/app.tsx,
      <absolute path>/plugins/baz/public/index.ts,
      <absolute path>/plugins/baz/public/main.tsx,
      <absolute path>/plugins/baz/public/service.ts,
      <absolute path>/plugins/baz/README.md,
      <absolute path>/plugins/baz/translations/ja-JP.json,
      <absolute path>/plugins/baz/tsconfig.json,
    ]
  `);
});
