/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsConfigApiResponse } from '../../../../../common/types/api_responses';
import type { RouteDependencies } from '../../..';

export const registerEsConfigRoute = ({ router, proxy }: RouteDependencies): void => {
  router.get(
    {
      path: '/api/console/es_config',
      security: {
        authz: {
          enabled: false,
          reason: 'Low effort request for config content',
        },
      },
      validate: false,
    },
    async (ctx, req, res) => {
      // Use the same method as the proxy to get consistent hosts
      const legacyConfig = await proxy.readLegacyESConfig();
      const { hosts } = legacyConfig;

      const body: EsConfigApiResponse = {
        host: hosts[0],
        allHosts: hosts,
      };

      return res.ok({ body });
    }
  );
};
