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

import { Server } from 'hapi';
import { createBasePathProxy } from '../../core';
import { setupLogging } from '../../server/logging';

export async function configureBasePathProxy(config) {
  // New platform forwards all logs to the legacy platform so we need HapiJS server
  // here just for logging purposes and nothing else.
  const server = new Server();
  setupLogging(server, config);

  const basePathProxy = createBasePathProxy({ server, config });

  await basePathProxy.configure({
    shouldRedirectFromOldBasePath: path => {
      const isApp = path.startsWith('app/');
      const isKnownShortPath = ['login', 'logout', 'status'].includes(path);

      return isApp || isKnownShortPath;
    },

    blockUntil: () => {
      // Wait until `serverWorker either crashes or starts to listen.
      // The `serverWorker` property should be set by the ClusterManager
      // once it creates the worker.
      const serverWorker = basePathProxy.serverWorker;
      if (serverWorker.listening || serverWorker.crashed) {
        return Promise.resolve();
      }

      return new Promise(resolve => {
        const done = () => {
          serverWorker.removeListener('listening', done);
          serverWorker.removeListener('crashed', done);

          resolve();
        };

        serverWorker.on('listening', done);
        serverWorker.on('crashed', done);
      });
    },
  });

  return basePathProxy;
}
