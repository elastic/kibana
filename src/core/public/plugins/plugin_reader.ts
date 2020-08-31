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

import { PluginInitializer } from './plugin';

/**
 * Unknown variant for internal use only for when plugins are not known.
 * @internal
 */
export type UnknownPluginInitializer = PluginInitializer<unknown, Record<string, unknown>>;

/**
 * Custom window type for loading bundles. Do not extend global Window to avoid leaking these types.
 * @internal
 */
export interface CoreWindow {
  __kbnBundles__: {
    has(key: string): boolean;
    get(key: string): { plugin: UnknownPluginInitializer } | undefined;
  };
}

/**
 * Reads the plugin's bundle declared in the global context.
 */
export function read(name: string) {
  const coreWindow = (window as unknown) as CoreWindow;
  const exportId = `plugin/${name}/public`;

  if (!coreWindow.__kbnBundles__.has(exportId)) {
    throw new Error(`Definition of plugin "${name}" not found and may have failed to load.`);
  }

  const pluginExport = coreWindow.__kbnBundles__.get(exportId);
  if (typeof pluginExport?.plugin !== 'function') {
    throw new Error(`Definition of plugin "${name}" should be a function.`);
  } else {
    return pluginExport.plugin;
  }
}
