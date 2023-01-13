/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages, getPluginPackagesFilter } from '@kbn/repo-packages';

interface Options {
  runExamples: boolean;
  pluginPaths: string[];
  pluginScanDirs: string[];
}

export type WatchPaths = ReturnType<typeof getServerWatchPaths>;

export function getServerWatchPaths(opts: Options) {
  const fromRoot = (p: string) => Path.resolve(REPO_ROOT, p);

  const pluginInternalDirsIgnore = opts.pluginScanDirs
    .map((scanDir) => Path.resolve(scanDir, '*'))
    .concat(opts.pluginPaths)
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

  function getServerPkgDirs() {
    const pluginFilter = getPluginPackagesFilter({
      examples: opts.runExamples,
      paths: opts.pluginPaths,
      parentDirs: opts.pluginScanDirs,
    });

    return getPackages(REPO_ROOT).flatMap((p) => {
      if (p.isPlugin) {
        return pluginFilter(p) && p.manifest.type === 'plugin-server' ? p.directory : [];
      }

      return p.manifest.type === 'shared-common' || p.manifest.type === 'shared-server'
        ? p.directory
        : [];
    });
  }

  const watchPaths = Array.from(
    new Set([
      fromRoot('src/core'),
      fromRoot('config'),
      ...opts.pluginPaths.map((path) => Path.resolve(path)),
      ...opts.pluginScanDirs.map((path) => Path.resolve(path)),
      ...getServerPkgDirs(),
    ])
  );

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
    fromRoot('x-pack/plugins/synthetics/e2e'),
    fromRoot('x-pack/plugins/ux/e2e'),
    fromRoot('x-pack/plugins/observability/e2e'),
  ];

  return {
    watchPaths,
    ignorePaths,
  };
}
