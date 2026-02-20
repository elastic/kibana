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
import type { DataViewsApiService } from './data_views';
import { getDataViewsApiHelper } from './data_views';
import type { FleetApiService } from './fleet';
import { getFleetApiHelper } from './fleet';
import type { SampleDataApiService } from './sample_data';
import { getSampleDataApiHelper } from './sample_data';
import type { SpacesApiService } from './spaces';
import { getSpacesApiHelper } from './spaces';
import type { StreamsApiService } from './streams';
import { getStreamsApiService } from './streams';

export interface ApiServicesFixture {
  alerting: AlertingApiService;
  cases: CasesApiService;
  dataViews: DataViewsApiService;
  fleet: FleetApiService;
  sampleData: SampleDataApiService;
  spaces: SpacesApiService;
  streams: StreamsApiService;
  core: CoreApiService;
  // add more services here
}

/**
 * This fixture provides a helper to interact with the Kibana APIs like Alerting, Cases, Fleet, Streams, Spaces, etc.
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
        dataViews: getDataViewsApiHelper(log, kbnClient),
        fleet: getFleetApiHelper(log, kbnClient),
        sampleData: getSampleDataApiHelper(log, kbnClient),
        spaces: getSpacesApiHelper(log, kbnClient),
        streams: getStreamsApiService({ kbnClient, log }),
        core: getCoreApiHelper(log, kbnClient),
      };

      log.serviceLoaded('apiServices');
      await use(services);
    },
    { scope: 'worker' },
  ],
});
