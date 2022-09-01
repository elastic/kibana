/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';

import { PluginAPluginSetup, PluginAPluginStart } from './types';

import { rpc, setContract } from './rpc';

export interface PluginASetup {
  somethingSpecialFromA(): Promise<{ yo: string }>;
}

export class PluginAPlugin implements Plugin<PluginAPluginSetup, PluginAPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('plugin_a: Setup');

    core.http.registerRPCDefinition(rpc);

    const somethingSpecialFromA = async () => ({
      yo: 'something special from a',
    });

    const contract: PluginASetup = {
      somethingSpecialFromA,
    };

    setContract(contract);

    return contract;
  }

  public start(core: CoreStart) {
    this.logger.debug('plugin_a: Started');
    return {};
  }

  public stop() {}
}
