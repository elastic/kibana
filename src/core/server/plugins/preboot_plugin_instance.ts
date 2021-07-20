/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PrebootPlugin } from './types';
import { CorePreboot } from '..';

/**
 * Lightweight wrapper around discovered plugin that is responsible for instantiating
 * plugin and dispatching proper context and dependencies into plugin's lifecycle hooks.
 *
 * @internal
 */
export class PrebootPluginInstance<TSetup = unknown, TPluginsSetup extends object = object> {
  constructor(private readonly innerInstance: PrebootPlugin<TSetup, TPluginsSetup>) {}

  /**
   * Instantiates plugin and calls `setup` function exposed by the plugin initializer.
   * @param setupContext Context that consists of various core services tailored specifically
   * for the `setup` lifecycle event.
   * @param plugins The dictionary where the key is the dependency name and the value
   * is the contract returned by the dependency's `setup` function.
   */
  public setup(setupContext: CorePreboot, plugins: TPluginsSetup): TSetup | Promise<TSetup> {
    return this.innerInstance.setup(setupContext, plugins);
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
