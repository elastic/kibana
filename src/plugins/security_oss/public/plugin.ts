/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import { ConfigType } from './config';
import {
  InsecureClusterService,
  InsecureClusterServiceSetup,
  InsecureClusterServiceStart,
} from './insecure_cluster_service';

export interface SecurityOssPluginSetup {
  insecureCluster: InsecureClusterServiceSetup;
}

export interface SecurityOssPluginStart {
  insecureCluster: InsecureClusterServiceStart;
}

export class SecurityOssPlugin
  implements Plugin<SecurityOssPluginSetup, SecurityOssPluginStart, {}, {}> {
  private readonly config: ConfigType;

  private insecureClusterService: InsecureClusterService;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<ConfigType>();
    this.insecureClusterService = new InsecureClusterService(this.config, localStorage);
  }

  public setup(core: CoreSetup) {
    return {
      insecureCluster: this.insecureClusterService.setup({ core }),
    };
  }

  public start(core: CoreStart) {
    return {
      insecureCluster: this.insecureClusterService.start({ core }),
    };
  }
}
