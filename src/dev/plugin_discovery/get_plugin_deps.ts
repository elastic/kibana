/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPlatformPlugin } from '@kbn/plugin-discovery';

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
