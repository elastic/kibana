/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreWorkerFixtures } from '../core_fixtures';
import type { AlertingApiService } from './alerting';
import { getAlertingApiHelper } from './alerting';
import type { CasesApiService } from './cases';
import { getCasesApiHelper } from './cases';
import type { CoreApiService } from './core';
import { getCoreApiHelper } from './core';
import type { FleetApiService } from './fleet';
import { getFleetApiHelper } from './fleet';
import type { StreamsApiService } from './streams';
import { getStreamsApiService } from './streams';

export interface ApiServicesFixture<TCondition = unknown, TStreamlangDSL = unknown> {
  alerting: AlertingApiService;
  cases: CasesApiService;
  fleet: FleetApiService;
  streams: StreamsApiService<TCondition, TStreamlangDSL>;
  core: CoreApiService;
  // add more services here
}

/**
 * This fixture provides a helper to interact with the Kibana APIs like Alerting, Cases, Fleet, Streams, Spaces, etc.
 *
 * The fixture is generic to allow consumers to provide specific types for Streams API.
 * Consumers can extend this fixture to provide their own types:
 *
 * @example
 * ```typescript
 * import type { Condition, StreamlangDSL } from '@kbn/streamlang';
 * import { apiServicesFixture as baseApiServicesFixture } from '@kbn/scout';
 *
 * export const apiServicesFixture = baseApiServicesFixture.extend({
 *   apiServices: async ({ apiServices }, use) => {
 *     await use(apiServices as ApiServicesFixture<Condition, StreamlangDSL>);
 *   },
 * });
 * ```
 */
export const apiServicesFixture = coreWorkerFixtures.extend<
  {},
  { apiServices: ApiServicesFixture }
>({
  apiServices: [
    async ({ kbnClient, log }, use) => {
      const services = {
        alerting: getAlertingApiHelper(log, kbnClient),
        cases: getCasesApiHelper(log, kbnClient),
        fleet: getFleetApiHelper(log, kbnClient),
        streams: getStreamsApiService({ kbnClient, log }),
        core: getCoreApiHelper(log, kbnClient),
      };

      log.serviceLoaded('apiServices');
      await use(services);
    },
    { scope: 'worker' },
  ],
});
