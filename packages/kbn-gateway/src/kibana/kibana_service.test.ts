/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import type { ConfigStart } from '../config';
import { configServiceMock } from '../config/config_service.mock';
import type { ServerStart } from '../server';
import { serverMock } from '../server/server.mock';
import { KibanaService } from './kibana_service';

describe('KibanaService', () => {
  let config: ConfigStart;
  let logger: MockedLogger;
  let server: ServerStart;

  beforeEach(() => {
    config = configServiceMock.createStartContract();
    logger = loggerMock.create();
    server = serverMock.createStartContract();
  });

  describe('start', () => {
    test(`doesn't return a start contract`, async () => {
      const kibanaService = new KibanaService({ config, logger });
      const kibanaStart = await kibanaService.start({ server });
      expect(kibanaStart).toBeUndefined();
    });

    test('registers /api/status route with the server', async () => {
      const kibanaService = new KibanaService({ config, logger });
      await kibanaService.start({ server });
      expect(server.addRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/api/status',
        })
      );
    });
  });
});
