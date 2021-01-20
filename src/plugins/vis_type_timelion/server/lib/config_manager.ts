/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializerContext } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import { configSchema } from '../../config';

export class ConfigManager {
  private esShardTimeout: number = 0;
  private graphiteUrls: string[] = [];

  constructor(config: PluginInitializerContext['config']) {
    config.create<TypeOf<typeof configSchema>>().subscribe((configUpdate) => {
      this.graphiteUrls = configUpdate.graphiteUrls || [];
    });

    config.legacy.globalConfig$.subscribe((configUpdate) => {
      this.esShardTimeout = configUpdate.elasticsearch.shardTimeout.asMilliseconds();
    });
  }

  getEsShardTimeout() {
    return this.esShardTimeout;
  }

  getGraphiteUrls() {
    return this.graphiteUrls;
  }
}
