/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import { first } from 'rxjs/operators';
import { isPromise } from '@kbn/std';
import { AsyncPlugin, Plugin, PluginName } from './types';
import { CoreSetup, CoreStart } from '..';

/**
 * Lightweight wrapper around discovered plugin that is responsible for instantiating
 * plugin and dispatching proper context and dependencies into plugin's lifecycle hooks.
 *
 * @internal
 */
export class StandardPluginInstance<
  TSetup = unknown,
  TStart = unknown,
  TPluginsSetup extends object = object,
  TPluginsStart extends object = object
> {
  private isInstanceSatup = false;
  private readonly startDependencies$ = new Subject<[CoreStart, TPluginsStart, TStart]>();
  public readonly startDependencies = this.startDependencies$.pipe(first()).toPromise();

  constructor(
    private readonly name: PluginName,
    private readonly innerInstance:
      | Plugin<TSetup, TStart, TPluginsSetup, TPluginsStart>
      | AsyncPlugin<TSetup, TStart, TPluginsSetup, TPluginsStart>
  ) {}

  /**
   * Instantiates plugin and calls `setup` function exposed by the plugin initializer.
   * @param setupContext Context that consists of various core services tailored specifically
   * for the `setup` lifecycle event.
   * @param plugins The dictionary where the key is the dependency name and the value
   * is the contract returned by the dependency's `setup` function.
   */
  public setup(setupContext: CoreSetup, plugins: TPluginsSetup): TSetup | Promise<TSetup> {
    const setupContract = this.innerInstance.setup(setupContext, plugins);
    this.isInstanceSatup = true;
    return setupContract;
  }

  /**
   * Calls `start` function exposed by the initialized plugin.
   * @param startContext Context that consists of various core services tailored specifically
   * for the `start` lifecycle event.
   * @param plugins The dictionary where the key is the dependency name and the value
   * is the contract returned by the dependency's `start` function.
   */
  public start(startContext: CoreStart, plugins: TPluginsStart): TStart | Promise<TStart> {
    if (!this.isInstanceSatup) {
      throw new Error(`Plugin "${this.name}" can't be started since it isn't set up.`);
    }

    const startContract = this.innerInstance.start(startContext, plugins);
    if (isPromise(startContract)) {
      return startContract.then((resolvedContract) => {
        this.startDependencies$.next([startContext, plugins, resolvedContract]);
        return resolvedContract;
      });
    } else {
      this.startDependencies$.next([startContext, plugins, startContract]);
      return startContract;
    }
  }

  /**
   * Calls optional `stop` function exposed by the plugin initializer.
   */
  public async stop() {
    if (typeof this.innerInstance.stop === 'function') {
      await this.innerInstance.stop();
    }
  }
}
