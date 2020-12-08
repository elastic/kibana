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

import { REPO_ROOT, createAbsolutePathSerializer } from '@kbn/dev-utils';

import { getServerWatchPaths } from './get_server_watch_paths';

expect.addSnapshotSerializer(createAbsolutePathSerializer());

it('produces the right watch and ignore list', () => {
  const { watchPaths, ignorePaths } = getServerWatchPaths({
    pluginPaths: [Path.resolve(REPO_ROOT, 'x-pack/test/plugin_functional/plugins/resolver_test')],
    pluginScanDirs: [
      Path.resolve(REPO_ROOT, 'src/plugins'),
      Path.resolve(REPO_ROOT, 'test/plugin_functional/plugins'),
      Path.resolve(REPO_ROOT, 'x-pack/plugins'),
    ],
  });

  expect(watchPaths).toMatchInlineSnapshot(`
    Array [
      <absolute path>/src/core,
      <absolute path>/src/legacy/server,
      <absolute path>/src/legacy/ui,
      <absolute path>/src/legacy/utils,
      <absolute path>/config,
      <absolute path>/x-pack/test/plugin_functional/plugins/resolver_test,
      <absolute path>/src/plugins,
      <absolute path>/test/plugin_functional/plugins,
      <absolute path>/x-pack/plugins,
    ]
  `);

  expect(ignorePaths).toMatchInlineSnapshot(`
    Array [
      /\\[\\\\\\\\\\\\/\\]\\(\\\\\\.\\.\\*\\|node_modules\\|bower_components\\|target\\|public\\|__\\[a-z0-9_\\]\\+__\\|coverage\\)\\(\\[\\\\\\\\\\\\/\\]\\|\\$\\)/,
      /\\\\\\.test\\\\\\.\\(js\\|tsx\\?\\)\\$/,
      /\\\\\\.\\(md\\|sh\\|txt\\)\\$/,
      /debug\\\\\\.log\\$/,
      <absolute path>/src/plugins/*/test/**,
      <absolute path>/src/plugins/*/build/**,
      <absolute path>/src/plugins/*/target/**,
      <absolute path>/src/plugins/*/scripts/**,
      <absolute path>/src/plugins/*/docs/**,
      <absolute path>/test/plugin_functional/plugins/*/test/**,
      <absolute path>/test/plugin_functional/plugins/*/build/**,
      <absolute path>/test/plugin_functional/plugins/*/target/**,
      <absolute path>/test/plugin_functional/plugins/*/scripts/**,
      <absolute path>/test/plugin_functional/plugins/*/docs/**,
      <absolute path>/x-pack/plugins/*/test/**,
      <absolute path>/x-pack/plugins/*/build/**,
      <absolute path>/x-pack/plugins/*/target/**,
      <absolute path>/x-pack/plugins/*/scripts/**,
      <absolute path>/x-pack/plugins/*/docs/**,
      <absolute path>/x-pack/test/plugin_functional/plugins/resolver_test/test/**,
      <absolute path>/x-pack/test/plugin_functional/plugins/resolver_test/build/**,
      <absolute path>/x-pack/test/plugin_functional/plugins/resolver_test/target/**,
      <absolute path>/x-pack/test/plugin_functional/plugins/resolver_test/scripts/**,
      <absolute path>/x-pack/test/plugin_functional/plugins/resolver_test/docs/**,
      <absolute path>/x-pack/plugins/reporting/chromium,
      <absolute path>/x-pack/plugins/security_solution/cypress,
      <absolute path>/x-pack/plugins/apm/e2e,
      <absolute path>/x-pack/plugins/apm/scripts,
      <absolute path>/x-pack/plugins/canvas/canvas_plugin_src,
      <absolute path>/x-pack/plugins/case/server/scripts,
      <absolute path>/x-pack/plugins/lists/scripts,
      <absolute path>/x-pack/plugins/lists/server/scripts,
      <absolute path>/x-pack/plugins/security_solution/scripts,
      <absolute path>/x-pack/plugins/security_solution/server/lib/detection_engine/scripts,
    ]
  `);
});
