/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { configServiceMock, IConfigServiceMock } from '@kbn/config-mocks';
import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import type { ServerStart } from '../server';
import { serverMock } from '../server/server.mock';
import { mockReadFileSync } from './kibana_service.test.mocks';
import { KibanaService } from './kibana_service';

describe('KibanaService', () => {
  let config: IConfigServiceMock;
  let logger: MockedLogger;
  let server: ServerStart;
  const mockConfig = {
    hosts: ['https://localhost:5605', 'https://localhost:5606'],
    requestTimeout: '30s',
    ssl: {
      certificate: '/herp/derp',
      certificateAuthorities: '/beep/boop',
      verificationMode: 'certificate',
    },
  };

  beforeEach(() => {
    mockReadFileSync.mockReset();
    mockReadFileSync.mockImplementation((path: string) => `content-of-${path}`);
    config = configServiceMock.create();
    config.atPathSync.mockReturnValue(mockConfig);
    logger = loggerMock.create();
    server = serverMock.createStartContract();
  });

  describe('start', () => {
    test(`doesn't return a start contract`, async () => {
      const kibanaService = new KibanaService({ config, logger });
      const kibanaStart = await kibanaService.start({ server });
      expect(kibanaStart).toBeUndefined();
    });

    test('registers / route with the server', async () => {
      const kibanaService = new KibanaService({ config, logger });
      await kibanaService.start({ server });
      expect(server.addRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/',
          handler: expect.any(Function),
        })
      );
    });

    test('registers /api/status route with the server', async () => {
      const kibanaService = new KibanaService({ config, logger });
      await kibanaService.start({ server });
      expect(server.addRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/api/status',
          handler: expect.any(Function),
        })
      );
    });
  });
});
