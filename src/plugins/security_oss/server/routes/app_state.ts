/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Observable } from 'rxjs';
import { combineLatest } from 'rxjs';

import type { IRouter, Logger } from 'src/core/server';

import type { AppState } from '../../common';
import type { createClusterDataCheck } from '../check_cluster_data';
import type { ConfigType } from '../config';

interface Deps {
  router: IRouter;
  log: Logger;
  config$: Observable<ConfigType>;
  displayModifier$: Observable<boolean>;
  doesClusterHaveUserData: ReturnType<typeof createClusterDataCheck>;
}

export const setupAppStateRoute = ({
  router,
  log,
  config$,
  displayModifier$,
  doesClusterHaveUserData,
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

      const appState: AppState = {
        insecureClusterAlert: { displayAlert },
      };
      return response.ok({ body: appState });
    }
  );
};
