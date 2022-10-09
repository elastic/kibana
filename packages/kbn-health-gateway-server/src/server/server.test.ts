/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { hapiStartMock, hapiStopMock, hapiRouteMock } from './server.test.mocks';
import { configServiceMock, IConfigServiceMock } from '@kbn/config-mocks';
import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import { Server } from './server';

describe('Server', () => {
  let config: IConfigServiceMock;
  let logger: MockedLogger;

  beforeEach(() => {
    config = configServiceMock.create();
    config.atPathSync.mockReturnValue({ port: 3000, host: 'localhost' });
    logger = loggerMock.create();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('start', () => {
    test('logs the uri on server start', async () => {
      const server = new Server({ config, logger });
      await server.start();
      expect(logger.info).toHaveBeenCalledWith('Server running on http://localhost:3000');
    });

    test('starts the Hapi server', async () => {
      const server = new Server({ config, logger });
      await server.start();
      expect(hapiStartMock).toHaveBeenCalledTimes(1);
    });

    describe('addRoute', () => {
      test('registers route with Hapi', async () => {
        const server = new Server({ config, logger });
        const { addRoute } = await server.start();
        addRoute({
          method: 'GET',
          path: '/api/whatever',
        });
        expect(hapiRouteMock).toHaveBeenCalledTimes(1);
        expect(hapiRouteMock).toHaveBeenCalledWith({
          method: 'GET',
          path: '/api/whatever',
        });
      });
    });
  });

  describe('stop', () => {
    test('attempts graceful shutdown', async () => {
      const server = new Server({ config, logger });
      await server.start();
      await server.stop();
      expect(hapiStopMock).toHaveBeenCalledTimes(1);
    });
  });
});
