/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EsConfigApiResponse } from '../../../../../common/types/api_responses';
import { RouteDependencies } from '../../..';

export const registerEsConfigRoute = ({ router, services }: RouteDependencies): void => {
  router.get({ path: '/api/console/es_config', validate: false }, async (ctx, req, res) => {
    if (services.cloud.elasticsearchUrl) {
      return res.ok({
        body: {
          host: services.cloud.elasticsearchUrl,
        },
      });
    }
    const {
      hosts: [rawHost],
    } = await services.esLegacyConfigService.readConfig();
    // strip username, password, URL params and other potentially sensitive info from hosts URL
    const hostUrl = new URL(rawHost);
    const host = `${hostUrl.origin}${hostUrl.pathname}`;

    const body: EsConfigApiResponse = { host };

    return res.ok({ body });
  });
};
