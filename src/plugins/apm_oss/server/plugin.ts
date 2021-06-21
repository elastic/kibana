/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { Plugin, PluginInitializerContext } from 'src/core/server';
import { APMOSSConfig } from './';

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

export interface APMOSSPluginSetup {
  config: APMOSSConfig;
  config$: Observable<APMOSSConfig>;
}
