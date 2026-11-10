/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Server } from 'http';
import supertest from 'supertest';
import { unsafeConsole } from '@kbn/security-hardening';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createRootWithCorePlugins, createTestServers } from '@kbn/core-test-helpers-kbn-server';

const EARLY_START_WARNING =
  'Early start of the HTTP server configured. This should only be enabled in full zero-downtime deployments.';
const ALREADY_LISTENING_INFO =
  'The HTTP server is already listening for requests. Skipping new start call.';

interface EarlyStartHttpServerAccess {
  savedObjects: {
    start: (deps: unknown) => Promise<unknown>;
  };
  http: {
    httpServer: {
      isListening: () => boolean;
      server: { listener: Server };
    };
  };
}

type TestRoot = ReturnType<typeof createRootWithCorePlugins>;

function createRoot({ earlyStartHttp }: { earlyStartHttp: boolean }) {
  return createRootWithCorePlugins({
    core: {
      lifecycle: {
        // Serverless does not run the preboot HTTP server, so nothing is listening until `http.start`.
        disablePreboot: true,
      },
      earlyStartHttp,
    },
    logging: {
      appenders: {
        'test-console': {
          type: 'console',
          layout: {
            type: 'json',
          },
        },
      },
      // Replace the helper's error-only `root` logger so info/warn lines reach the spy.
      loggers: [
        {
          name: 'root',
          appenders: ['test-console'],
          level: 'info',
        },
      ],
      root: {
        appenders: ['test-console'],
        level: 'info',
      },
    },
  });
}

function getServer(root: TestRoot): EarlyStartHttpServerAccess {
  return (root as unknown as { server: EarlyStartHttpServerAccess }).server;
}

/**
 * Pauses `savedObjects.start` so a probe can observe the window after the optional early HTTP
 * start and before migrations run.
 */
function holdSavedObjectMigrations(root: TestRoot) {
  const server = getServer(root);
  let releaseMigrations = () => {};
  const migrationsGate = new Promise<void>((resolve) => {
    releaseMigrations = resolve;
  });
  let markMigrationsEntered = () => {};
  // Resolves when `savedObjects.start` is entered, so a failed start does not leave a timer running.
  const migrationsEntered = new Promise<void>((resolve) => {
    markMigrationsEntered = resolve;
  });
  const originalStart = server.savedObjects.start.bind(server.savedObjects);
  server.savedObjects.start = async (deps: unknown) => {
    markMigrationsEntered();
    await migrationsGate;
    return originalStart(deps);
  };

  const startPromise = root.start();
  // The probe awaits this later. Swallow the rejection here so a failed start is not unhandled
  // while the test is still inside the pre-migration window.
  startPromise.catch(() => {});

  return {
    releaseMigrations,
    migrationsEntered,
    isHttpListening: () => server.http.httpServer.isListening(),
    listener: () => server.http.httpServer.server.listener,
    startPromise,
  };
}

async function waitUntilMigrationsHeld(
  held: ReturnType<typeof holdSavedObjectMigrations>
): Promise<void> {
  let migrationsHeld = false;
  try {
    await Promise.race([
      held.migrationsEntered.then(() => {
        migrationsHeld = true;
      }),
      held.startPromise,
    ]);
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }

  if (!migrationsHeld) {
    throw new Error(
      'Kibana finished starting before saved objects startup was paused. The early HTTP window was missed.'
    );
  }
}

function consoleMessages(mockConsoleLog: jest.SpyInstance): string[] {
  return mockConsoleLog.mock.calls.map((call) => {
    const raw = String(call[0]);
    try {
      const parsed = JSON.parse(raw) as { message?: string };
      return parsed.message ?? raw;
    } catch {
      return raw;
    }
  });
}

async function waitForStatus(
  listener: Server,
  expectedStatus: number
): Promise<supertest.Response> {
  const deadline = Date.now() + 30_000;
  let last: supertest.Response | undefined;
  while (Date.now() < deadline) {
    last = await supertest(listener).get('/api/status');
    if (last.status === expectedStatus) {
      return last;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `expected GET /api/status to return ${expectedStatus}, last response was ${last?.status}: ${last?.text}`
  );
}

describe('core.earlyStartHttp', () => {
  let esServer: TestElasticsearchUtils;
  let mockConsoleLog: jest.SpyInstance;

  beforeAll(async () => {
    mockConsoleLog = jest.spyOn(unsafeConsole, 'log');
    const { startES } = createTestServers({
      adjustTimeout: (timeout: number) => jest.setTimeout(timeout),
      settings: {
        es: {
          license: 'basic',
        },
      },
    });
    jest.setTimeout(600_000);
    esServer = await startES();
  });

  beforeEach(() => {
    mockConsoleLog.mockClear();
  });

  afterAll(async () => {
    mockConsoleLog.mockRestore();
    await esServer?.stop();
  });

  it('serves /api/status before saved object migrations finish, then reports available', async () => {
    const root = createRoot({ earlyStartHttp: true });
    let held: ReturnType<typeof holdSavedObjectMigrations> | undefined;

    try {
      await root.preboot();
      await root.setup();
      held = holdSavedObjectMigrations(root);
      await waitUntilMigrationsHeld(held);

      expect(held.isHttpListening()).toBe(true);
      const duringMigrations = await supertest(held.listener()).get('/api/status').expect(503);
      expect(duringMigrations.text).not.toContain('Kibana server is not ready yet');
      expect(duringMigrations.body.status.overall.level).toBe('unavailable');

      held.releaseMigrations();
      await held.startPromise;

      const ready = await waitForStatus(held.listener(), 200);
      expect(ready.body.status.overall.level).toBe('available');
      expect(consoleMessages(mockConsoleLog)).toEqual(
        expect.arrayContaining([EARLY_START_WARNING, ALREADY_LISTENING_INFO])
      );
    } finally {
      held?.releaseMigrations();
      await held?.startPromise.catch(() => undefined);
      await root.shutdown();
    }
  });

  it('does not listen during saved object migrations when earlyStartHttp is disabled', async () => {
    const root = createRoot({ earlyStartHttp: false });
    let held: ReturnType<typeof holdSavedObjectMigrations> | undefined;

    try {
      await root.preboot();
      await root.setup();
      held = holdSavedObjectMigrations(root);
      await waitUntilMigrationsHeld(held);

      expect(held.isHttpListening()).toBe(false);
      expect(consoleMessages(mockConsoleLog)).not.toContain(EARLY_START_WARNING);

      held.releaseMigrations();
      await held.startPromise;

      const ready = await waitForStatus(held.listener(), 200);
      expect(ready.body.status.overall.level).toBe('available');
      expect(consoleMessages(mockConsoleLog)).not.toContain(ALREADY_LISTENING_INFO);
    } finally {
      held?.releaseMigrations();
      await held?.startPromise.catch(() => undefined);
      await root.shutdown();
    }
  });
});
