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

import { callPluginHook } from './lib';

/**
 *  KbnServer mixin that initializes all plugins found in ./scan mixin
 *  @param  {KbnServer} kbnServer
 *  @param  {Hapi.Server} server
 *  @param  {Config} config
 *  @return {Promise<undefined>}
 */
export async function initializeMixin(kbnServer, server, config) {
  if (!config.get('plugins.initialize')) {
    server.log(['info'], 'Plugin initialization disabled.');
    return;
  }

  async function callHookOnPlugins(hookName) {
    const { plugins } = kbnServer;
    const ids = plugins.map((p) => p.id);

    for (const id of ids) {
      await callPluginHook(hookName, plugins, id, []);
    }
  }

  await callHookOnPlugins('preInit');
  await callHookOnPlugins('init');
  await callHookOnPlugins('postInit');
}
