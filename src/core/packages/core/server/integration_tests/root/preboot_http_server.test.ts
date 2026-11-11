/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createServer } from 'net';
import supertest from 'supertest';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createRootWithCorePlugins, createTestServers } from '@kbn/core-test-helpers-kbn-server';

const getFreePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        server.close(() => reject(new Error('Unable to find a free port')));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });

const createRootWithDisabledPreboot = (port: number) =>
  createRootWithCorePlugins({
    core: { lifecycle: { disablePreboot: true } },
    server: { port },
    ops: { interval: '100ms' },
  });

const getEluHistory = (request: supertest.Agent) =>
  request.get('/api/_elu_history').query({ apiVersion: '1', elasticInternalOrigin: 'true' });

describe('Preboot HTTP server when preboot is disabled', () => {
  let port: number;
  let request: supertest.Agent;

  beforeEach(async () => {
    port = await getFreePort();
    request = supertest.agent(`http://localhost:${port}`);
  });

  describe('while Elasticsearch is not available', () => {
    let root: ReturnType<typeof createRootWithDisabledPreboot>;

    beforeEach(() => {
      root = createRootWithDisabledPreboot(port);
    });

    afterEach(async () => {
      await root.shutdown();
    });

    it('serves the ELU history API and replies 503 to any other request', async () => {
      await root.preboot();
      await root.setup();
      // `start` waits for Elasticsearch, which is never started in this test.
      const startPromise = root.start();
      startPromise.catch(() => {});

      const { body: statusBody } = await request.get('/api/status').expect(503);
      expect(statusBody).toEqual({ status: { overall: { level: 'unavailable' } } });

      await request
        .get('/app/home')
        .set('x-elastic-internal-origin', 'kibana')
        .expect(503, 'Kibana server is not ready yet');

      // Wait for a few ELU samples
      await new Promise((resolve) => setTimeout(resolve, 500));
      const { body: eluBody } = await getEluHistory(request).expect(200);
      expect(eluBody).toEqual({
        history: {
          short: expect.any(Number),
          medium: expect.any(Number),
          long: expect.any(Number),
        },
      });
      expect(eluBody.history.short).toBeGreaterThan(0);
    });
  });

  describe('once Kibana has started', () => {
    let esServer: TestElasticsearchUtils;
    let root: ReturnType<typeof createRootWithDisabledPreboot>;

    beforeAll(async () => {
      const { startES } = createTestServers({
        adjustTimeout: (timeout: number) => jest.setTimeout(timeout),
        settings: { es: { license: 'basic' } },
      });
      esServer = await startES();
    });

    afterAll(async () => {
      await esServer?.stop();
    });

    beforeEach(() => {
      root = createRootWithDisabledPreboot(port);
    });

    afterEach(async () => {
      await root.shutdown();
    });

    it('hands the port over to the main HTTP server', async () => {
      await root.preboot();
      await request.get('/api/status').expect(503);

      await root.setup();
      await root.start();

      const { body: statusBody } = await request.get('/api/status').expect(200);
      expect(statusBody.status.overall.level).toBe('available');
      await getEluHistory(request).expect(200);
    });
  });
});
