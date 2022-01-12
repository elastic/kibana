/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { createAbsolutePathSerializer } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';

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
      /\\\\\\.\\(test\\|spec\\)\\\\\\.\\(js\\|ts\\|tsx\\)\\$/,
      /\\\\\\.\\(md\\|sh\\|txt\\)\\$/,
      /debug\\\\\\.log\\$/,
      <absolute path>/src/plugins/*/test/**,
      <absolute path>/src/plugins/*/integration_tests/**,
      <absolute path>/src/plugins/*/build/**,
      <absolute path>/src/plugins/*/target/**,
      <absolute path>/src/plugins/*/scripts/**,
      <absolute path>/src/plugins/*/docs/**,
      <absolute path>/test/plugin_functional/plugins/*/test/**,
      <absolute path>/test/plugin_functional/plugins/*/integration_tests/**,
      <absolute path>/test/plugin_functional/plugins/*/build/**,
      <absolute path>/test/plugin_functional/plugins/*/target/**,
      <absolute path>/test/plugin_functional/plugins/*/scripts/**,
      <absolute path>/test/plugin_functional/plugins/*/docs/**,
      <absolute path>/x-pack/plugins/*/test/**,
      <absolute path>/x-pack/plugins/*/integration_tests/**,
      <absolute path>/x-pack/plugins/*/build/**,
      <absolute path>/x-pack/plugins/*/target/**,
      <absolute path>/x-pack/plugins/*/scripts/**,
      <absolute path>/x-pack/plugins/*/docs/**,
      <absolute path>/x-pack/test/plugin_functional/plugins/resolver_test/test/**,
      <absolute path>/x-pack/test/plugin_functional/plugins/resolver_test/integration_tests/**,
      <absolute path>/x-pack/test/plugin_functional/plugins/resolver_test/build/**,
      <absolute path>/x-pack/test/plugin_functional/plugins/resolver_test/target/**,
      <absolute path>/x-pack/test/plugin_functional/plugins/resolver_test/scripts/**,
      <absolute path>/x-pack/test/plugin_functional/plugins/resolver_test/docs/**,
      <absolute path>/x-pack/plugins/screenshotting/chromium,
      <absolute path>/x-pack/plugins/security_solution/cypress,
      <absolute path>/x-pack/plugins/apm/scripts,
      <absolute path>/x-pack/plugins/apm/ftr_e2e,
      <absolute path>/x-pack/plugins/canvas/canvas_plugin_src,
      <absolute path>/x-pack/plugins/cases/server/scripts,
      <absolute path>/x-pack/plugins/lists/scripts,
      <absolute path>/x-pack/plugins/lists/server/scripts,
      <absolute path>/x-pack/plugins/security_solution/scripts,
      <absolute path>/x-pack/plugins/security_solution/server/lib/detection_engine/scripts,
      <absolute path>/x-pack/plugins/metrics_entities/server/scripts,
      <absolute path>/x-pack/plugins/uptime/e2e,
    ]
  `);
});
