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

import Fs from 'fs';

import globby from 'globby';
import { run, REPO_ROOT } from '@kbn/dev-utils';

run(async ({ log }) => {
  const files = await globby(
    ['**/kibana.json', '!**/{node_modules,fixtures,__fixtures__,sao_template}/**'],
    {
      cwd: REPO_ROOT,
    }
  );

  const plugins = files.map((path) => JSON.parse(Fs.readFileSync(path, 'utf8')));

  const loadOrder = new Set<string>();

  function load(plugin: any, path: string[] = []) {
    if (path.includes(plugin.id)) {
      log.warning('circular dep', [...path.slice(path.indexOf(plugin.id)), plugin.id].join(' -> '));
      return;
    }
    path = [...path, plugin.id];

    for (const depId of plugin.requiredPlugins || []) {
      const dep = plugins.find((p) => p.id === depId);
      if (dep.ui) {
        load(dep, path);
      }
    }

    for (const depId of plugin.optionalPlugins || []) {
      const dep = plugins.find((p) => p.id === depId);
      if (dep && dep.ui) {
        load(dep, path);
      }
    }

    if (!loadOrder.has(plugin.id)) {
      loadOrder.add(plugin.id);
    }
  }

  for (const plugin of plugins) {
    if (plugin.ui) {
      load(plugin);
    }
  }

  const depCount = new Map<string, number>();
  function incrDepCount(id: string) {
    const count = depCount.get(id) || 0;
    depCount.set(id, count + 1);
  }

  for (const plugin of plugins) {
    for (const depId of plugin.requiredPlugins || []) {
      incrDepCount(depId);
    }
    for (const depId of plugin.optionalPlugins || []) {
      incrDepCount(depId);
    }
  }

  const pluginUsageInLoadOrder = new Map<string, number>();
  for (const id of loadOrder) {
    const count = depCount.get(id) || 0;
    pluginUsageInLoadOrder.set(id, count);
  }

  log.success(pluginUsageInLoadOrder);
});
