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

import { CoreStart, StartServicesAccessor } from '../../../../core/public';

export interface StartServices<Plugins = unknown, OwnContract = unknown, Core = CoreStart> {
  plugins: Plugins;
  self: OwnContract;
  core: Core;
}

export type StartServicesGetter<
  Plugins = unknown,
  OwnContract = unknown,
  Core = CoreStart
> = () => StartServices<Plugins, OwnContract>;

/**
 * Use this utility to create a synchronous *start* service getter in *setup*
 * life-cycle of your plugin.
 *
 * Below is a usage example in a Kibana plugin.
 *
 * ```ts
 * export interface MyPluginStartDeps {
 *   data: DataPublicPluginStart;
 *   expressions: ExpressionsStart;
 *   inspector: InspectorStart;
 *   uiActions: UiActionsStart;
 * }
 *
 * class MyPlugin implements Plugin {
 *   setup(core: CoreSetup<MyPluginStartDeps>, plugins) {
 *     const start = createStartServicesGetter(core.getStartServices);
 *     plugins.expressions.registerFunction(myExpressionFunction(start));
 *   }
 *
 *   start(core, plugins: MyPluginStartDeps) {
 *
 *   }
 * }
 * ```
 *
 * In `myExpressionFunction` you can make sure you are picking only the dependencies
 * your function needs using the `Pick` type.
 *
 * ```ts
 * const myExpressionFunction =
 *   (start: StartServicesGetter<Pick<MyPluginStartDeps, 'data'>>) => {
 *
 *   start().plugins.indexPatterns.something(123);
 * }
 * ```
 *
 * @param accessor Asynchronous start service accessor provided by platform.
 * @returns Returns a function which synchronously returns *start* core services
 * and plugin contracts. If you call this function before the *start* life-cycle
 * has started it will throw.
 */
export const createStartServicesGetter = <TPluginsStart extends object, TStart>(
  accessor: StartServicesAccessor<TPluginsStart, TStart>
): StartServicesGetter<TPluginsStart, TStart> => {
  let services: StartServices<TPluginsStart, TStart> | undefined;

  accessor().then(
    ([core, plugins, self]) => {
      services = {
        core,
        plugins,
        self,
      };
    },
    (error) => {
      // eslint-disable-next-line no-console
      console.error('Could not access start services.', error);
    }
  );

  return () => {
    if (!services) throw new Error('Trying to access start services before start.');
    return services;
  };
};
