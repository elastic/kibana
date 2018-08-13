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

import { IS_KIBANA_DISTRIBUTABLE } from '../../utils';

export async function sassMixin(kbnServer, server, config) {
  if (process.env.kbnWorkerType === 'optmzr') {
    return;
  }


  /**
   * Build assets
   *
   * SCSS is only transpiled while running from source
   */

  if (IS_KIBANA_DISTRIBUTABLE) {
    return;
  }

  const { buildAll } = require('./build_all');
  let scssBundles = [];
  let trackedFiles = new Set();

  try {
    scssBundles = await buildAll(kbnServer.pluginSpecs);

    scssBundles.forEach(bundle => {
      bundle.includedFiles.forEach(file => trackedFiles.add(file));
      server.log(['info', 'scss'], `Compiled CSS: ${bundle.source}`);
    });
  } catch(error) {
    const { message, line, file } = error;

    trackedFiles.add(file);
    server.log(['warning', 'scss'], `${message} on line ${line} of ${file}`);
  }


  /**
   * Setup Watchers
   *
   * Similar to the optimizer, we only setup watchers while in development mode
   */

  if (!config.get('env').dev) {
    return;
  }

  const { FSWatcher } = require('chokidar');
  const watcher = new FSWatcher({ ignoreInitial: true });

  watcher.add([...trackedFiles]);

  watcher.on('all', async (event, path) => {
    const currentlyTrackedFiles = new Set();

    server.log(['debug', 'scss'], `${path} triggered ${event}`);

    // build bundles containing the changed file
    await Promise.all(scssBundles.map(async bundle => {
      try {
        if (await bundle.buildIfIncluded(path)) {
          bundle.includedFiles.forEach(file => currentlyTrackedFiles.add(file));
          server.log(['info', 'scss'], `Compiled ${bundle.source} due to change in ${path}`);
        }
      } catch(error) {
        const { message, line, file } = error;
        currentlyTrackedFiles.add(file);
        server.log(['warning', 'scss'], `${message} on line ${line} of ${file}`);
      }
    }, []));

    /**
     * update watchers
     */

    // un-watch files no longer included in any bundle
    trackedFiles.forEach(file => {
      if (currentlyTrackedFiles.has(file)) {
        return;
      }

      watcher.unwatch(file);
      server.log(['debug', 'scss'], `No longer watching ${file}`);
    });

    // watch files not previously included in any bundle
    currentlyTrackedFiles.forEach(file => {
      if (trackedFiles.has(file)) {
        return;
      }

      watcher.add(file);
      server.log(['debug', 'scss'], `Now watching ${file}`);
    });

    trackedFiles = currentlyTrackedFiles;
  });
}