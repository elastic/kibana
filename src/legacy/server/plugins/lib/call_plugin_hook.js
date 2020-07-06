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

import { last } from 'lodash';

export async function callPluginHook(hookName, plugins, id, history) {
  const plugin = plugins.find((plugin) => plugin.id === id);

  // make sure this is a valid plugin id
  if (!plugin) {
    if (history.length) {
      throw new Error(`Unmet requirement "${id}" for plugin "${last(history)}"`);
    } else {
      throw new Error(`Unknown plugin "${id}"`);
    }
  }

  const circleStart = history.indexOf(id);
  const path = [...history, id];

  // make sure we are not trying to load a dependency within itself
  if (circleStart > -1) {
    const circle = path.slice(circleStart);
    throw new Error(`circular dependency found: "${circle.join(' -> ')}"`);
  }

  // call hook on all dependencies
  for (const req of plugin.requiredIds) {
    await callPluginHook(hookName, plugins, req, path);
  }

  // call hook on this plugin
  await plugin[hookName]();
}
