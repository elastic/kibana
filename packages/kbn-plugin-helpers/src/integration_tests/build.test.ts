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

import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import { createStripAnsiSerializer, createReplaceSerializer } from '@kbn/jest-serializers';
import extract from 'extract-zip';
import del from 'del';
import globby from 'globby';
import loadJsonFile from 'load-json-file';

const PLUGIN_DIR = Path.resolve(REPO_ROOT, 'plugins/foo_test_plugin');
const PLUGIN_BUILD_DIR = Path.resolve(PLUGIN_DIR, 'build');
const PLUGIN_ARCHIVE = Path.resolve(PLUGIN_BUILD_DIR, `fooTestPlugin-7.5.0.zip`);
const TMP_DIR = Path.resolve(__dirname, '__tmp__');

expect.addSnapshotSerializer(createReplaceSerializer(/[\d\.]+ sec/g, '<time>'));
expect.addSnapshotSerializer(createReplaceSerializer(/\d+(\.\d+)?[sm]/g, '<time>'));
expect.addSnapshotSerializer(createReplaceSerializer(/yarn (\w+) v[\d\.]+/g, 'yarn $1 <version>'));
expect.addSnapshotSerializer(createStripAnsiSerializer());

beforeEach(async () => {
  await del([PLUGIN_DIR, TMP_DIR]);
  Fs.mkdirSync(TMP_DIR);
});

afterEach(async () => await del([PLUGIN_DIR, TMP_DIR]));

it('builds a generated plugin into a viable archive', async () => {
  const generateProc = await execa(
    process.execPath,
    ['scripts/generate_plugin', '-y', '--name', 'fooTestPlugin'],
    {
      cwd: REPO_ROOT,
      all: true,
    }
  );
  const filterLogs = (logs: string | undefined) => {
    return logs
      ?.split('\n')
      .filter((l) => !l.includes('failed to reach ci-stats service'))
      .join('\n');
  };

  expect(filterLogs(generateProc.all)).toMatchInlineSnapshot(`
    " succ 🎉

          Your plugin has been created in plugins/foo_test_plugin
    "
  `);

  const buildProc = await execa(
    process.execPath,
    ['../../scripts/plugin_helpers', 'build', '--kibana-version', '7.5.0'],
    {
      cwd: PLUGIN_DIR,
      all: true,
    }
  );

  expect(filterLogs(buildProc.all)).toMatchInlineSnapshot(`
    " info deleting the build and target directories
     info run bazel and build required artifacts for the optimizer
     succ bazel run successfully and artifacts were created
     info running @kbn/optimizer
     │ succ browser bundle created at plugins/foo_test_plugin/build/kibana/fooTestPlugin/target/public
     │ info stopping @kbn/optimizer
     info compressing js and css bundles found at plugins/foo_test_plugin/build/kibana/fooTestPlugin/target/public to brotli
     info copying assets from \`public/assets\` to build
     info copying server source into the build and converting with babel
     info running yarn to install dependencies
     info compressing plugin into [fooTestPlugin-7.5.0.zip]
     succ plugin archive created"
  `);

  await extract(PLUGIN_ARCHIVE, { dir: TMP_DIR });

  const files = await globby(['**/*'], { cwd: TMP_DIR, dot: true });
  files.sort((a, b) => a.localeCompare(b));

  expect(files).toMatchInlineSnapshot(`
    Array [
      "kibana/fooTestPlugin/.i18nrc.json",
      "kibana/fooTestPlugin/common/index.js",
      "kibana/fooTestPlugin/kibana.json",
      "kibana/fooTestPlugin/node_modules/.yarn-integrity",
      "kibana/fooTestPlugin/package.json",
      "kibana/fooTestPlugin/server/index.js",
      "kibana/fooTestPlugin/server/plugin.js",
      "kibana/fooTestPlugin/server/routes/index.js",
      "kibana/fooTestPlugin/server/types.js",
      "kibana/fooTestPlugin/target/public/fooTestPlugin.chunk.998.js",
      "kibana/fooTestPlugin/target/public/fooTestPlugin.chunk.998.js.br",
      "kibana/fooTestPlugin/target/public/fooTestPlugin.plugin.js",
      "kibana/fooTestPlugin/target/public/fooTestPlugin.plugin.js.br",
      "kibana/fooTestPlugin/translations/ja-JP.json",
      "kibana/fooTestPlugin/tsconfig.json",
    ]
  `);

  expect(loadJsonFile.sync(Path.resolve(TMP_DIR, 'kibana', 'fooTestPlugin', 'kibana.json')))
    .toMatchInlineSnapshot(`
    Object {
      "description": "",
      "id": "fooTestPlugin",
      "kibanaVersion": "7.5.0",
      "optionalPlugins": Array [],
      "owner": Object {
        "githubTeam": "",
        "name": "",
      },
      "requiredPlugins": Array [
        "navigation",
      ],
      "server": true,
      "ui": true,
      "version": "1.0.0",
    }
  `);
});
