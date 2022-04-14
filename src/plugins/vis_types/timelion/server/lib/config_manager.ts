/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from 'kibana/server';

export class ConfigManager {
  private esShardTimeout: number = 0;

  constructor(config: PluginInitializerContext['config']) {
    config.legacy.globalConfig$.subscribe((configUpdate) => {
      this.esShardTimeout = configUpdate.elasticsearch.shardTimeout.asMilliseconds();
    });
  }

  getEsShardTimeout() {
    return this.esShardTimeout;
  }
}
