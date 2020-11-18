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
import { KibanaPlatformPlugin } from '@kbn/dev-utils';

interface AllOptions {
  id: string;
  pluginMap: Map<string, KibanaPlatformPlugin>;
}

interface CircularRefsError {
  from: string;
  to: string;
  stack: string[];
}

export type SearchErrors = CircularRefsError;

interface State {
  deps: Set<KibanaPlatformPlugin>;
  stack: string[];
  errors: Map<string, SearchErrors>;
}

function traverse(pluginMap: Map<string, KibanaPlatformPlugin>, state: State, id: string) {
  const plugin = pluginMap.get(id);
  if (plugin === undefined) {
    throw new Error(`Unknown plugin id: ${id}`);
  }

  const prevIndex = state.stack.indexOf(id);
  const isVisited = prevIndex > -1;
  if (isVisited) {
    const from = state.stack[state.stack.length - 1];
    const to = id;
    const key = `circular-${[from, to].sort().join('-')}`;

    if (!state.errors.has(key)) {
      const error: CircularRefsError = {
        from,
        to,
        // provide sub-stack with circular refs only
        stack: state.stack.slice(prevIndex),
      };
      state.errors.set(key, error);
    }

    return;
  }

  state.stack.push(id);
  new Set([
    ...plugin.manifest.requiredPlugins,
    ...plugin.manifest.optionalPlugins,
    ...plugin.manifest.requiredBundles,
  ]).forEach((depId) => {
    state.deps.add(pluginMap.get(depId)!);
    traverse(pluginMap, state, depId);
  });

  state.stack.pop();
}

export function getPluginDeps({ pluginMap, id }: AllOptions): State {
  const state: State = {
    deps: new Set(),
    errors: new Map(),
    stack: [],
  };

  traverse(pluginMap, state, id);

  return state;
}
