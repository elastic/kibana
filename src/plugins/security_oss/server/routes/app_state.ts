/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
