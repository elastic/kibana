/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter, Logger } from 'kibana/server';
import { combineLatest, Observable } from 'rxjs';
import { createClusterDataCheck } from '../check_cluster_data';
import { ConfigType } from '../config';

interface Deps {
  router: IRouter;
  log: Logger;
  config$: Observable<ConfigType>;
  displayModifier$: Observable<boolean>;
  doesClusterHaveUserData: ReturnType<typeof createClusterDataCheck>;
}

export const setupDisplayInsecureClusterAlertRoute = ({
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
    {
      path: '/internal/security_oss/display_insecure_cluster_alert',
      validate: false,
    },
    async (context, request, response) => {
      if (!showInsecureClusterWarning) {
        return response.ok({ body: { displayAlert: false } });
      }

      const hasData = await doesClusterHaveUserData(
        context.core.elasticsearch.client.asInternalUser,
        log
      );
      return response.ok({ body: { displayAlert: hasData } });
    }
  );
};
