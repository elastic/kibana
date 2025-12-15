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
import type { StreamsApiService, StreamsApiServiceTypes } from './streams';
import { getStreamsApiService } from './streams';

/**
 * Type definitions for all API services.
 * Each service can define its own types that consumers can override.
 */
export interface ApiServicesTypes {
  streams?: StreamsApiServiceTypes;
  // Future services can add their types here:
  // alerting?: AlertingServiceTypes;
  // cases?: CasesServiceTypes;
}

/**
 * Main fixture interface for API services.
 * Uses a type parameter object pattern for better scalability.
 *
 * @example
 * ```typescript
 * // Without custom types (uses defaults)
 * const services: ApiServicesFixture = ...;
 *
 * // With custom types for streams
 * interface CustomTypes extends ApiServicesTypes {
 *   streams: {
 *     condition: Condition;
 *     streamlangDSL: StreamlangDSL;
 *     routingStatus: RoutingStatus;
 *     streamDefinition: IngestStream.all.GetResponse;
 *     ingestUpsertRequest: IngestUpsertRequest;
 *   };
 * }
 * const services: ApiServicesFixture<CustomTypes> = ...;
 * ```
 */
export interface ApiServicesFixture<T extends ApiServicesTypes = {}> {
  alerting: AlertingApiService;
  cases: CasesApiService;
  fleet: FleetApiService;
  streams: StreamsApiService<T['streams'] extends StreamsApiServiceTypes ? T['streams'] : {}>;
  core: CoreApiService;
  // add more services here
}

/**
 * This fixture provides a helper to interact with the Kibana APIs like Alerting, Cases, Fleet, Streams, Spaces, etc.
 *
 * The fixture uses a type parameter object pattern for better scalability. Consumers can extend
 * the ApiServicesTypes interface to provide specific types for any service.
 *
 * @example
 * ```typescript
 * import type { Condition, StreamlangDSL } from '@kbn/streamlang';
 * import type { RoutingStatus, IngestStream, IngestUpsertRequest } from '@kbn/streams-schema';
 * import type { ApiServicesTypes } from '@kbn/scout';
 * import { apiServicesFixture as baseApiServicesFixture } from '@kbn/scout';
 *
 * interface CustomTypes extends ApiServicesTypes {
 *   streams: {
 *     condition: Condition;
 *     streamlangDSL: StreamlangDSL;
 *     routingStatus: RoutingStatus;
 *     streamDefinition: IngestStream.all.GetResponse;
 *     ingestUpsertRequest: IngestUpsertRequest;
 *   };
 * }
 *
 * export const apiServicesFixture = baseApiServicesFixture.extend({
 *   apiServices: async ({ apiServices }, use) => {
 *     await use(apiServices as ApiServicesFixture<CustomTypes>);
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
