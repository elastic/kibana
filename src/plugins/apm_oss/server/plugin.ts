/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { APMOSSConfig } from '.';
import type { Plugin, PluginInitializerContext } from '../../../core/server/plugins/types';
import type { APMOSSPluginSetup } from './types';

export type { APMOSSPluginSetup };

export class APMOSSPlugin implements Plugin<APMOSSPluginSetup> {
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }
  public setup() {
    const config$ = this.initContext.config.create<APMOSSConfig>();
    const config = this.initContext.config.get<APMOSSConfig>();
    return { config, config$ };
  }

  start() {}
  stop() {}
}
