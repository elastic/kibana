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

// This test exercises preboot -> main-server handoff. We intentionally target localhost:port
// instead of getSupertest(root, ...), because getSupertest is bound to the main server listener
// and cannot hit the preboot server paths and the handoff that this lifecycle test needs.
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

const waitFor = async (
  check: () => Promise<boolean>,
  { timeoutMs = 20_000, intervalMs = 100 } = {}
) => {
  const timeoutAt = Date.now() + timeoutMs;
  while (Date.now() < timeoutAt) {
    if (await check()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out after ${timeoutMs}ms`);
};

describe('/api/ready', () => {
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

    it('returns 503 and keeps serving ELU from preboot', async () => {
      await root.preboot();
      await root.setup();
      const startPromise = root.start();
      startPromise.catch(() => {});

      await request.get('/api/ready').expect((response) => {
        expect(response.status).not.toBe(200);
      });

      await new Promise((resolve) => setTimeout(resolve, 500));
      await getEluHistory(request).expect(200);
    });
  });

  describe('once Kibana has started', () => {
    let esServer: TestElasticsearchUtils;
    let root: ReturnType<typeof createRootWithDisabledPreboot> | undefined;

    beforeEach(async () => {
      const { startES } = createTestServers({
        adjustTimeout: (timeout: number) => jest.setTimeout(timeout),
        settings: { es: { license: 'basic' } },
      });
      esServer = await startES();
      root = createRootWithDisabledPreboot(port);
    });

    afterEach(async () => {
      await root?.shutdown();
      await esServer?.stop();
    });

    it('returns 200 only after Kibana start completes, and stays ready when ES goes down', async () => {
      await root!.preboot();
      await request.get('/api/ready').expect((response) => {
        expect(response.status).not.toBe(200);
      });

      await root!.setup();
      await root!.start();
      await request.get('/api/ready').expect(200, { ok: true });

      await esServer.stop();
      await waitFor(
        async () => {
          const response = await request.get('/api/status');
          return response.status === 503;
        },
        { timeoutMs: 60_000 }
      );
      await request.get('/api/ready').expect(200, { ok: true });
    });

    it('stops reporting ready once shutdown begins', async () => {
      await root!.preboot();
      await root!.setup();
      await root!.start();
      await request.get('/api/ready').expect(200, { ok: true });

      const shutdownPromise = root!.shutdown();
      await waitFor(async () => {
        try {
          const response = await request.get('/api/ready');
          return response.status !== 200;
        } catch {
          return true;
        }
      });

      await shutdownPromise;
      root = undefined;
    });
  });
});
