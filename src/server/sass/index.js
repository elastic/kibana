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

  function onSuccess(builder) {
    server.log(['info', 'scss'], `Compiled CSS: ${builder.source}`);
  }

  function onError(builder, error) {
    server.log(['warning', 'scss'], `Compiling CSS failed: ${builder.source}`);
    server.log(['warning', 'scss'], error);
  }

  const scssBundles = await buildAll(kbnServer.pluginSpecs, { onSuccess, onError });


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

  scssBundles.forEach(bundle => {
    watcher.add(bundle.getGlob());
  });

  watcher.on('all', async (event, path) => {
    for (let i = 0; i < scssBundles.length; i++) {
      if (await scssBundles[i].buildIfInPath(path)) {
        return;
      }
    }
  });
}