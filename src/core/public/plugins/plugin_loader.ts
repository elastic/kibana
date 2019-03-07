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

import { PluginName } from '../../server';
import { PluginInitializer } from './plugin';

/**
 * Unknown variant for internal use only for when plugins are not known.
 * @internal
 */
export type UnknownPluginInitializer = PluginInitializer<unknown, Record<string, unknown>>;

/**
 * Extend window with types for loading bundles
 * @internal
 */
declare global {
  interface Window {
    __kbnNonce__: string;
    __kbnBundles__: {
      [pluginBundleName: string]: UnknownPluginInitializer | undefined;
    };
  }
}

/**
 * Loads the bundle for a plugin onto the page and returns their PluginInitializer. This should
 * be called for all plugins (once per plugin) in parallel using Promise.all.
 *
 * If this is slowing down browser load time, there are some ways we could make this faster:
 *    - Add these bundles in the generated bootstrap.js file so they're loaded immediately
 *    - Concatenate all the bundles files on the backend and serve them in single request.
 *    - Use HTTP/2 to load these bundles without having to open new connections for each.
 *
 * This may not be much of an issue since these should be cached by the browser after the first
 * page load.
 *
 * @param basePath
 * @param plugins
 * @internal
 */
export const loadPluginBundle: LoadPluginBundle = <
  TSetup,
  TDependencies extends Record<string, unknown>
>(
  addBasePath: (path: string) => string,
  pluginName: PluginName
) =>
  new Promise<PluginInitializer<TSetup, TDependencies>>((resolve, reject) => {
    const script = document.createElement('script');

    // Assumes that all plugin bundles get put into the bundles/plugins subdirectory
    const bundlePath = addBasePath(`/bundles/plugin/${pluginName}.bundle.js`);
    script.setAttribute('src', bundlePath);
    script.setAttribute('id', `kbn-plugin-${pluginName}`);
    script.setAttribute('async', '');

    // Add kbnNonce for CSP
    script.setAttribute('nonce', window.__kbnNonce__);

    // Wire up resolve and reject
    script.onload = () => {
      const initializer = window.__kbnBundles__[`plugin/${pluginName}`];

      if (!initializer || typeof initializer !== 'function') {
        reject(
          new Error(`Definition of plugin "${pluginName}" should be a function (${bundlePath}).`)
        );
      } else {
        resolve(initializer as PluginInitializer<TSetup, TDependencies>);
      }
    };
    script.onerror = reject;

    // Add the script tag to the end of the body to start downloading
    document.body.appendChild(script);
  });

export type LoadPluginBundle = <TSetup, TDependencies extends Record<string, unknown>>(
  addBasePath: (path: string) => string,
  pluginName: PluginName
) => Promise<PluginInitializer<TSetup, TDependencies>>;
