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

  try {
    const scssBundles = await buildAll(kbnServer.pluginSpecs);

    scssBundles.forEach(builder => {
      server.log(['info', 'scss'], `Compiled CSS: ${builder.source}`);
    });

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

    function allTrackedFiles() {
      return scssBundles.reduce((acc, bundle) => {
        bundle.stats.includedFiles.forEach(file => acc.add(file));
        return acc;
      }, new Set());
    }

    let previousFiles = allTrackedFiles();

    watcher.add([...previousFiles]);

    watcher.on('all', async (event, path) => {
      server.log(['debug', 'scss'], `${path} triggered ${event}`);

      // build bundles containing the changed file
      await Promise.all(scssBundles.map(async bundle => {
        if (await bundle.buildIfIncluded(path)) {
          server.log(['info', 'scss'], `Compiled ${bundle.source} due to change in ${path}`);
        }
      }, []));

      /**
       * update watchers
       */

      const currentFiles = allTrackedFiles();

      // un-watch files no longer included in any bundle
      previousFiles.forEach(file => {
        if (currentFiles.has(file)) {
          return;
        }

        server.log(['debug', 'scss'], `No longer watching ${file}`);
        watcher.unwatch(file);
      });

      // watch files not previously included in any bundle
      currentFiles.forEach(file => {
        if (previousFiles.has(file)) {
          return;
        }

        server.log(['debug', 'scss'], `Now watching ${file}`);
        watcher.add(file);
      });

      previousFiles = currentFiles;
    });
  } catch(error) {
    server.log(['warning', 'scss'], `${error.message} on line ${error.line} of ${error.file}`);
  }
}