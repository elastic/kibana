/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type {
  Capabilities,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from 'src/core/public';
import type { ConfigType } from './config';
import {
  InsecureClusterService,
  InsecureClusterServiceSetup,
  InsecureClusterServiceStart,
} from './insecure_cluster_service';
import { AppStateService } from './app_state';

export interface SecurityOssPluginSetup {
  insecureCluster: InsecureClusterServiceSetup;
}

export interface SecurityOssPluginStart {
  insecureCluster: InsecureClusterServiceStart;
  anonymousAccess: {
    getAccessURLParameters: () => Promise<Record<string, string> | null>;
    getCapabilities: () => Promise<Capabilities>;
  };
}

export class SecurityOssPlugin
  implements Plugin<SecurityOssPluginSetup, SecurityOssPluginStart, {}, {}> {
  private readonly config = this.initializerContext.config.get<ConfigType>();
  private readonly insecureClusterService = new InsecureClusterService(this.config, localStorage);
  private readonly appStateService = new AppStateService();

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    return {
      insecureCluster: this.insecureClusterService.setup({ core }),
    };
  }

  public start(core: CoreStart) {
    const appState = this.appStateService.start({ core });
    return {
      insecureCluster: this.insecureClusterService.start({ core, appState }),
      anonymousAccess: {
        async getAccessURLParameters() {
          const { anonymousAccess } = await appState.getState();
          return anonymousAccess.accessURLParameters;
        },
        getCapabilities() {
          return core.http.get<Capabilities>(
            '/internal/security_oss/anonymous_access/capabilities'
          );
        },
      },
    };
  }
}
