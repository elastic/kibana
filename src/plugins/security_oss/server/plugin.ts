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

import { CoreSetup, Logger, Plugin, PluginInitializerContext } from 'kibana/server';
import { BehaviorSubject, Observable } from 'rxjs';
import { createClusterDataCheck } from './check_cluster_data';
import { ConfigType } from './config';
import { setupDisplayInsecureClusterAlertRoute } from './routes';

export interface SecurityOssPluginSetup {
  /**
   * Allows consumers to show/hide the insecure cluster warning.
   */
  showInsecureClusterWarning$: BehaviorSubject<boolean>;
}

export class SecurityOssPlugin implements Plugin<SecurityOssPluginSetup, void, {}, {}> {
  private readonly config$: Observable<ConfigType>;
  private readonly logger: Logger;

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

    return {
      showInsecureClusterWarning$,
    };
  }

  public start() {}

  public stop() {}
}
