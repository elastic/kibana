/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CriticalError } from '@kbn/core-base-server-internal';
import {
  createTestServers,
  createRootWithCorePlugins,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { Root } from '..';

describe('migration only node', () => {
  let root: Root;
  let es: TestElasticsearchUtils;

  beforeEach(async () => {
    const { startES } = createTestServers({ adjustTimeout: jest.setTimeout });
    es = await startES();
    root = createRootWithCorePlugins({ node: { roles: ['migrator'] } });
  });

  afterEach(async () => {
    await es.stop();
    await root.shutdown().catch(() => {});
    jest.resetAllMocks();
  });

  it('runs migrations then shuts down Kibana', async () => {
    const shutdownSpy = jest.spyOn(root, 'shutdown');
    await root.preboot();
    await root.setup();

    // Extracting the error so we can do more detailed assertions on it
    let migrationException: undefined | CriticalError;
    await root.start().catch((e) => (migrationException = e));

    expect(migrationException).not.toBeUndefined();
    expect(migrationException).toBeInstanceOf(CriticalError);
    expect(migrationException!.message).toBe('Migrations completed, shutting down Kibana');
    expect(migrationException!.code).toBe('MigrationOnlyNode');
    expect(migrationException!.processExitCode).toBe(0);
    expect(migrationException!.cause).toBeUndefined();

    expect(shutdownSpy).toHaveBeenCalledTimes(1);
  });
});
