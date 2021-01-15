/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
