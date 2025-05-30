/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreWorkerFixtures } from '../core_fixtures';
import { FleetApiService, getFleetApiHelper } from './fleet';
import { StreamsApiService, getStreamsApiService } from './streams';

export interface ApiServicesFixture {
  fleet: FleetApiService;
  streams: StreamsApiService;
  // add more services here
}

/**
 * This fixture provides a helper to interact with the Kibana APIs like Fleet, Spaces, Alerting, etc.
 */
export const apiServicesFixture = coreWorkerFixtures.extend<
  {},
  { apiServices: ApiServicesFixture }
>({
  apiServices: [
    async ({ kbnClient, log }, use) => {
      const services = {
        fleet: getFleetApiHelper(log, kbnClient),
        streams: getStreamsApiService({ kbnClient, log }),
      };

      log.serviceLoaded('apiServices');
      await use(services);
    },
    { scope: 'worker' },
  ],
});
