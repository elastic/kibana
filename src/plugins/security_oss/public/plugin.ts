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

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import { ConfigType } from './config';
import {
  InsecureClusterService,
  InsecureClusterServiceSetup,
  InsecureClusterServiceStart,
} from './insecure_cluster_service';

export interface SavedObjectTypeAnonymousAccess {
  /**
   * Indicates whether anonymous user can access particular Saved Object type (e.g. dashboard, map etc.).
   */
  canAccess: boolean;
  /**
   * A map of query string parameters that should be specified in URL so that anonymous user can use
   * to automatically log in to Kibana and access particular Saved Object type.
   */
  accessURLParameters: Record<string, string> | null;
}

export interface SecurityOssPluginSetup {
  insecureCluster: InsecureClusterServiceSetup;
}

export interface SecurityOssPluginStart {
  insecureCluster: InsecureClusterServiceStart;
  anonymousAccess: {
    isAnonymousAccessEnabled: boolean;
    canAccessSavedObjectType: (savedObjectType: string) => Promise<SavedObjectTypeAnonymousAccess>;
  };
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
    const isAnonymousAccessEnabled = !!core.application.capabilities.security?.anonymousAccess;
    return {
      insecureCluster: this.insecureClusterService.start({ core }),
      anonymousAccess: {
        isAnonymousAccessEnabled,
        async canAccessSavedObjectType(savedObjectType: string) {
          if (isAnonymousAccessEnabled) {
            return await core.http.get<SavedObjectTypeAnonymousAccess>(
              `/internal/security/anonymous_access/_can_access_saved_object_type?type=${encodeURIComponent(
                savedObjectType
              )}`
            );
          }

          return { canAccess: false, accessURLParameters: null };
        },
      },
    };
  }
}
