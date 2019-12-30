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

/**
 * Tracks the individual queue for each kbnServer, rather than attaching
 * it to the kbnServer object via a property or something
 * @type {WeakMap}
 */
const queues = new WeakMap();

export function waitForInitSetupMixin(kbnServer) {
  queues.set(kbnServer, []);

  kbnServer.afterPluginsInit = function(callback) {
    const queue = queues.get(kbnServer);

    if (!queue) {
      throw new Error(
        'Plugins have already initialized. Only use this method for setup logic that must wait for plugins to initialize.'
      );
    }

    queue.push(callback);
  };
}

export async function waitForInitResolveMixin(kbnServer, server, config) {
  const queue = queues.get(kbnServer);
  queues.set(kbnServer, null);

  // only actually call the callbacks if we are really initializing
  if (config.get('plugins.initialize')) {
    for (const cb of queue) {
      await cb();
    }
  }
}
