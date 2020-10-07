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
