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

import { BehaviorSubject } from 'rxjs';
import { UnwrapPromise } from '@kbn/utility-types';

import {
  MetricsServiceSetup,
  ServiceStatus,
  ServiceStatusLevels,
} from '../../../../../core/server';
import {
  contextServiceMock,
  loggingSystemMock,
  metricsServiceMock,
} from '../../../../../core/server/mocks';
import { createHttpServer } from '../../../../../core/server/test_utils';
import { registerStatsRoute } from '../stats';
import supertest from 'supertest';
import { CollectorSet } from '../../collector';

type HttpService = ReturnType<typeof createHttpServer>;
type HttpSetup = UnwrapPromise<ReturnType<HttpService['setup']>>;

describe('/api/stats', () => {
  let server: HttpService;
  let httpSetup: HttpSetup;
  let overallStatus$: BehaviorSubject<ServiceStatus>;
  let metrics: MetricsServiceSetup;

  beforeEach(async () => {
    server = createHttpServer();
    httpSetup = await server.setup({
      context: contextServiceMock.createSetupContract(),
    });
    overallStatus$ = new BehaviorSubject<ServiceStatus>({
      level: ServiceStatusLevels.available,
      summary: 'everything is working',
    });
    metrics = metricsServiceMock.createSetupContract();

    const router = httpSetup.createRouter('');
    registerStatsRoute({
      router,
      collectorSet: new CollectorSet({
        logger: loggingSystemMock.create().asLoggerFactory().get(),
      }),
      config: {
        allowAnonymous: true,
        kibanaIndex: '.kibana-test',
        kibanaVersion: '8.8.8-SNAPSHOT',
        server: {
          name: 'mykibana',
          hostname: 'mykibana.com',
          port: 1234,
        },
        uuid: 'xxx-xxxxx',
      },
      metrics,
      overallStatus$,
    });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('successfully returns data', async () => {
    const response = await supertest(httpSetup.server.listener).get('/api/stats').expect(200);
    expect(response.body).toMatchObject({
      kibana: {
        uuid: 'xxx-xxxxx',
        name: 'mykibana',
        index: '.kibana-test',
        host: 'mykibana.com',
        locale: 'en',
        transport_address: `mykibana.com:1234`,
        version: '8.8.8',
        snapshot: true,
        status: 'green',
      },
      last_updated: expect.any(String),
      collection_interval_ms: expect.any(Number),
    });
  });
});
