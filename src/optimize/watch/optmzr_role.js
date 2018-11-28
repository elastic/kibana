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

import { resolve } from 'path';

import WatchServer from './watch_server';
import WatchOptimizer, { STATUS } from './watch_optimizer';
import { WatchCache } from './watch_cache';

export default async (kbnServer, kibanaHapiServer, config) => {
  const log = (tags, data) => kibanaHapiServer.log(tags, data);

  const watchOptimizer = new WatchOptimizer({
    log,
    uiBundles: kbnServer.uiBundles,
    profile: config.get('optimize.profile'),
    sourceMaps: config.get('optimize.sourceMaps'),
    prebuild: config.get('optimize.watchPrebuild'),
    unsafeCache: config.get('optimize.unsafeCache'),
    watchCache: new WatchCache({
      log,
      outputPath: config.get('path.data'),
      cachePath: resolve(kbnServer.uiBundles.getCacheDirectory(), '../'),
    })
  });

  const server = new WatchServer(
    config.get('optimize.watchHost'),
    config.get('optimize.watchPort'),
    config.get('server.basePath'),
    watchOptimizer
  );

  watchOptimizer.status$.subscribe({
    next(status) {
      process.send(['OPTIMIZE_STATUS', {
        success: status.type === STATUS.SUCCESS
      }]);
    }
  });

  let ready = false;

  const sendReady = () => {
    if (!process.connected) return;
    process.send(['WORKER_BROADCAST', { optimizeReady: ready }]);
  };

  process.on('message', (msg) => {
    if (msg && msg.optimizeReady === '?') sendReady();
  });


  sendReady();

  await server.init();

  ready = true;
  sendReady();
};
