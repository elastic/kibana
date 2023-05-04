/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, StartServicesAccessor } from '@kbn/core/public';

interface StartServices<Plugins = unknown, OwnContract = unknown, Core = CoreStart> {
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
