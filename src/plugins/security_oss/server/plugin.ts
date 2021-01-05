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

import { CoreSetup, KibanaRequest, Logger, Plugin, PluginInitializerContext } from 'kibana/server';
import { BehaviorSubject, Observable } from 'rxjs';
import { createClusterDataCheck } from './check_cluster_data';
import { ConfigType } from './config';
import {
  setupDisplayInsecureClusterAlertRoute,
  setupCanAccessSavedObjectTypeRoute,
} from './routes';

export interface SecurityOssPluginSetup {
  /**
   * Allows consumers to show/hide the insecure cluster warning.
   */
  showInsecureClusterWarning$: BehaviorSubject<boolean>;

  /**
   * Set the provider function that returns a service that can deal with various aspects of the
   * anonymous access.
   * @param provider
   */
  setAnonymousAccessServiceProvider: (provider: () => AnonymousAccessService) => void;
}

export interface AnonymousAccessService {
  /**
   * Indicates whether anonymous access is enabled.
   */
  readonly isAnonymousAccessEnabled: boolean;

  /**
   * A map of query string parameters that should be specified in URL so that anonymous user can use
   * to automatically log in to Kibana and access particular Saved Object type.
   */
  readonly accessURLParameters: Readonly<Map<string, string>> | null;

  /**
   * Checks if the specified Saved Object type is accessible
   * @param request Kibana request instance.
   * @param savedObjectType Saved Object type to check access for.
   */
  isSavedObjectTypeAccessibleAnonymously: (
    request: KibanaRequest,
    savedObjectType: string
  ) => Promise<boolean>;
}

export class SecurityOssPlugin implements Plugin<SecurityOssPluginSetup, void, {}, {}> {
  private readonly config$: Observable<ConfigType>;
  private readonly logger: Logger;
  private anonymousAccessServiceProvider?: () => AnonymousAccessService;

  constructor(initializerContext: PluginInitializerContext<ConfigType>) {
    this.config$ = initializerContext.config.create();
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    const showInsecureClusterWarning$ = new BehaviorSubject<boolean>(true);

    setupDisplayInsecureClusterAlertRoute({
      router,
      log: this.logger,
      config$: this.config$,
      displayModifier$: showInsecureClusterWarning$,
      doesClusterHaveUserData: createClusterDataCheck(),
    });

    setupCanAccessSavedObjectTypeRoute({
      router,
      getAnonymousAccessService: () => {
        if (!this.anonymousAccessServiceProvider) {
          throw new Error('Anonymous Access service provider is not set.');
        }

        return this.anonymousAccessServiceProvider();
      },
    });

    return {
      showInsecureClusterWarning$,
      setAnonymousAccessServiceProvider: (provider: () => AnonymousAccessService) => {
        if (this.anonymousAccessServiceProvider) {
          throw new Error('Anonymous Access service provider is already set.');
        }

        this.anonymousAccessServiceProvider = provider;
      },
    };
  }

  public start() {}

  public stop() {}
}
