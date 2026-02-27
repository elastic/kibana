/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsConfigApiResponse } from '../../../../../common/types/api_responses';
import { stripCredentialsFromUrl } from '../../../../lib/utils';
import type { RouteDependencies } from '../../..';

export const registerEsConfigRoute = ({ router, services, proxy }: RouteDependencies): void => {
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
      const cloudUrl = services.esLegacyConfigService.getCloudUrl();

      // Always get the actual proxy hosts for allHosts
      const legacyConfig = await proxy.readLegacyESConfig();
      const { hosts } = legacyConfig;
      const sanitizedHosts = hosts.map(stripCredentialsFromUrl);

      if (cloudUrl) {
        const body: EsConfigApiResponse = {
          host: stripCredentialsFromUrl(cloudUrl),
          // Use actual proxy hosts, not cloudUrl
          allHosts: sanitizedHosts,
        };

        return res.ok({ body });
      }

      const body: EsConfigApiResponse = {
        host: sanitizedHosts[0],
        allHosts: sanitizedHosts,
      };

      return res.ok({ body });
    }
  );
};
