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

import type { IRouter, Logger } from 'kibana/server';
import { combineLatest, Observable } from 'rxjs';
import type { AppState } from '../../common';
import { createClusterDataCheck } from '../check_cluster_data';
import type { ConfigType } from '../config';
import type { AnonymousAccessService } from '../plugin';

interface Deps {
  router: IRouter;
  log: Logger;
  config$: Observable<ConfigType>;
  displayModifier$: Observable<boolean>;
  doesClusterHaveUserData: ReturnType<typeof createClusterDataCheck>;
  getAnonymousAccessService: () => AnonymousAccessService | null;
}

export const setupAppStateRoute = ({
  router,
  log,
  config$,
  displayModifier$,
  doesClusterHaveUserData,
  getAnonymousAccessService,
}: Deps) => {
  let showInsecureClusterWarning = false;

  combineLatest([config$, displayModifier$]).subscribe(([config, displayModifier]) => {
    showInsecureClusterWarning = config.showInsecureClusterWarning && displayModifier;
  });

  router.get(
    { path: '/internal/security_oss/app_state', validate: false },
    async (context, request, response) => {
      let displayAlert = false;
      if (showInsecureClusterWarning) {
        displayAlert = await doesClusterHaveUserData(
          context.core.elasticsearch.client.asInternalUser,
          log
        );
      }

      const anonymousAccessService = getAnonymousAccessService();
      const appState: AppState = {
        insecureClusterAlert: { displayAlert },
        anonymousAccess: {
          isEnabled: anonymousAccessService?.isAnonymousAccessEnabled ?? false,
          accessURLParameters: anonymousAccessService?.accessURLParameters
            ? Object.fromEntries(anonymousAccessService.accessURLParameters.entries())
            : null,
        },
      };
      return response.ok({ body: appState });
    }
  );
};
