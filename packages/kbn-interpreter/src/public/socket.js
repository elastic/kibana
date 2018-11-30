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

import io from 'socket.io-client';
import { functionsRegistry } from '../common/lib/functions_registry';
import { getBrowserRegistries } from './browser_registries';

const SOCKET_CONNECTION_TIMEOUT = 5000; // timeout in ms
let socket;

export async function createSocket(basePath) {
  if (socket != null) return socket;

  return new Promise((resolve, rej) => {
    const reject = p => {
      socket = null; // reset the socket on errors
      rej(p);
    };

    socket = io({
      path: `${basePath}/socket.io`,
      transports: ['polling', 'websocket'],
      transportOptions: {
        polling: {
          extraHeaders: {
            'kbn-xsrf': 'professionally-crafted-string-of-text',
          },
        },
      },
      timeout: SOCKET_CONNECTION_TIMEOUT,
      // ensure socket.io always tries polling first, otherwise auth will fail
      rememberUpgrade: false,
    });

    socket.on('getFunctionList', () => {
      const pluginsLoaded = getBrowserRegistries();
      pluginsLoaded.then(() => socket.emit('functionList', functionsRegistry.toJS()));
    });

    socket.on('connect', () => {
      resolve();
    });

    function errorHandler(err) {
      // 'connectionFailed' returns an object with a reason prop
      // other error cases provide their own error
      reject(err.reason ? new Error(err.reason) : err);
    }

    socket.on('connectionFailed', errorHandler);
    socket.on('connect_error', errorHandler);
    socket.on('connect_timeout', errorHandler);
  });
}

export function getSocket() {
  if (!socket) throw new Error('getSocket failed, socket has not been created');
  return socket;
}
