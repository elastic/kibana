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
import Fs from 'fs';

import { REPO_ROOT } from '@kbn/dev-utils';

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
        fromRoot('src/legacy/ui'),
        fromRoot('src/legacy/utils'),
        fromRoot('config'),
        ...pluginPaths,
        ...pluginScanDirs,
      ].map((path) => Path.resolve(path))
    )
  );

  for (const watchPath of watchPaths) {
    if (!Fs.existsSync(fromRoot(watchPath))) {
      throw new Error(
        `A watch directory [${watchPath}] does not exist, which will cause chokidar to fail. Either make sure the directory exists or remove it as a watch source in the ClusterManger`
      );
    }
  }

  const ignorePaths = [
    /[\\\/](\..*|node_modules|bower_components|target|public|__[a-z0-9_]+__|coverage)([\\\/]|$)/,
    /\.test\.(js|tsx?)$/,
    /\.(md|sh|txt)$/,
    /debug\.log$/,
    ...pluginInternalDirsIgnore,
    fromRoot('x-pack/plugins/reporting/chromium'),
    fromRoot('x-pack/plugins/security_solution/cypress'),
    fromRoot('x-pack/plugins/apm/e2e'),
    fromRoot('x-pack/plugins/apm/scripts'),
    fromRoot('x-pack/plugins/canvas/canvas_plugin_src'), // prevents server from restarting twice for Canvas plugin changes,
    fromRoot('x-pack/plugins/case/server/scripts'),
    fromRoot('x-pack/plugins/lists/scripts'),
    fromRoot('x-pack/plugins/lists/server/scripts'),
    fromRoot('x-pack/plugins/security_solution/scripts'),
    fromRoot('x-pack/plugins/security_solution/server/lib/detection_engine/scripts'),
  ];

  return {
    watchPaths,
    ignorePaths,
  };
}
