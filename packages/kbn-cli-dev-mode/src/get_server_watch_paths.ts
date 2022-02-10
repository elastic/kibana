/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import { REPO_ROOT } from '@kbn/utils';

interface Options {
  pluginPaths: string[];
  pluginScanDirs: string[];
}

export type WatchPaths = ReturnType<typeof getServerWatchPaths>;

export function getServerWatchPaths({ pluginPaths, pluginScanDirs }: Options) {
  const fromRoot = (p: string) => Path.resolve(REPO_ROOT, p);

  const pluginInternalDirsIgnore = pluginScanDirs
    .map((scanDir) => Path.resolve(scanDir, '*'))
    .concat(pluginPaths)
    .reduce(
      (acc: string[], path) => [
        ...acc,
        Path.resolve(path, 'test/**'),
        Path.resolve(path, 'integration_tests/**'),
        Path.resolve(path, 'build/**'),
        Path.resolve(path, 'target/**'),
        Path.resolve(path, 'scripts/**'),
        Path.resolve(path, 'docs/**'),
      ],
      []
    );

  const watchPaths = Array.from(
    new Set(
      [
        fromRoot('src/core'),
        fromRoot('src/legacy/server'),
        fromRoot('src/legacy/utils'),
        fromRoot('config'),
        ...pluginPaths,
        ...pluginScanDirs,
      ].map((path) => Path.resolve(path))
    )
  ).filter((path) => Fs.existsSync(fromRoot(path)));

  const ignorePaths = [
    /[\\\/](\..*|node_modules|bower_components|target|public|__[a-z0-9_]+__|coverage)([\\\/]|$)/,
    /\.(test|spec)\.(js|ts|tsx)$/,
    /\.(md|sh|txt)$/,
    /debug\.log$/,
    ...pluginInternalDirsIgnore,
    fromRoot('x-pack/plugins/screenshotting/chromium'),
    fromRoot('x-pack/plugins/security_solution/cypress'),
    fromRoot('x-pack/plugins/apm/scripts'),
    fromRoot('x-pack/plugins/apm/ftr_e2e'), // prevents restarts for APM cypress tests
    fromRoot('x-pack/plugins/canvas/canvas_plugin_src'), // prevents server from restarting twice for Canvas plugin changes,
    fromRoot('x-pack/plugins/cases/server/scripts'),
    fromRoot('x-pack/plugins/lists/scripts'),
    fromRoot('x-pack/plugins/lists/server/scripts'),
    fromRoot('x-pack/plugins/security_solution/scripts'),
    fromRoot('x-pack/plugins/security_solution/server/lib/detection_engine/scripts'),
    fromRoot('x-pack/plugins/metrics_entities/server/scripts'),
    fromRoot('x-pack/plugins/uptime/e2e'),
  ];

  return {
    watchPaths,
    ignorePaths,
  };
}
