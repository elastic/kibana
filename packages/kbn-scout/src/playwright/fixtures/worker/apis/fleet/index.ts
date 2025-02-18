/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { measurePerformanceAsync } from '../../../../../common';
import { coreWorkerFixtures } from '../../core_fixtures';

export interface FleetApiFixture {
  integration: {
    install: (name: string) => Promise<void>;
    delete: (name: string) => Promise<void>;
  };
}

/**
 * This fixture provides a helper to interact with the Fleet API.
 */
export const fleetApiFixture = coreWorkerFixtures.extend<{}, { fleetApi: FleetApiFixture }>({
  fleetApi: [
    async ({ kbnClient, log }, use) => {
      const fleetApiHelper = {
        integration: {
          install: async (name: string) => {
            await measurePerformanceAsync(
              log,
              `fleetApi.integration.install [${name}]`,
              async () => {
                await kbnClient.request({
                  method: 'POST',
                  path: `/api/fleet/epm/custom_integrations`,
                  body: {
                    force: true,
                    integrationName: name,
                    datasets: [
                      { name: `${name}.access`, type: 'logs' },
                      { name: `${name}.error`, type: 'metrics' },
                      { name: `${name}.warning`, type: 'logs' },
                    ],
                  },
                });
              }
            );
          },

          delete: async (name: string) => {
            await measurePerformanceAsync(
              log,
              `fleetApi.integration.delete [${name}]`,
              async () => {
                await kbnClient.request({
                  method: 'DELETE',
                  path: `/api/fleet/epm/packages/${name}`,
                  ignoreErrors: [400],
                });
              }
            );
          },
        },
      };

      log.serviceLoaded('fleetApi');
      await use(fleetApiHelper);
    },
    { scope: 'worker' },
  ],
});
