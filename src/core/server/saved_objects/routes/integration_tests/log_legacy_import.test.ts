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

import supertest from 'supertest';
import { UnwrapPromise } from '@kbn/utility-types';
import { registerLogLegacyImportRoute } from '../log_legacy_import';
import { loggingSystemMock } from '../../../logging/logging_system.mock';
import { setupServer } from '../test_utils';

type setupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

describe('POST /api/saved_objects/_log_legacy_import', () => {
  let server: setupServerReturn['server'];
  let httpSetup: setupServerReturn['httpSetup'];
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(async () => {
    ({ server, httpSetup } = await setupServer());
    logger = loggingSystemMock.createLogger();

    const router = httpSetup.createRouter('/api/saved_objects/');
    registerLogLegacyImportRoute(router, logger);

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('logs a warning when called', async () => {
    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_log_legacy_import')
      .expect(200);

    expect(result.body).toEqual({ success: true });
    expect(loggingSystemMock.collect(logger).warn).toMatchInlineSnapshot(`
      Array [
        Array [
          "Importing saved objects from a .json file has been deprecated",
        ],
      ]
    `);
  });
});
