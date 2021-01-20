/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import supertest from 'supertest';
import { UnwrapPromise } from '@kbn/utility-types';
import { registerLogLegacyImportRoute } from '../log_legacy_import';
import { loggingSystemMock } from '../../../logging/logging_system.mock';
import { setupServer } from '../test_utils';

type SetupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

describe('POST /api/saved_objects/_log_legacy_import', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
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
