/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { migratorInstanceMock } from './migrate.test.mocks';

import { createRoot, request } from '@kbn/core-test-helpers-kbn-server';

describe('SavedObjects /_migrate endpoint', () => {
  let root: ReturnType<typeof createRoot>;

  beforeEach(async () => {
    root = createRoot({
      migrations: { skip: true },
      plugins: { initialize: false },
      elasticsearch: { skipStartupConnectionCheck: true },
    });
    await root.preboot();
    await root.setup();
    await root.start();
    migratorInstanceMock.runMigrations.mockClear();
  });

  afterEach(async () => {
    await root.shutdown();
  });

  it('calls runMigrations on the migrator with rerun=true when accessed', async () => {
    await request.post(root, '/internal/saved_objects/_migrate').send({}).expect(200);

    expect(migratorInstanceMock.runMigrations).toHaveBeenCalledTimes(1);
    expect(migratorInstanceMock.runMigrations).toHaveBeenCalledWith({ rerun: true });
  });

  it('calls runMigrations multiple time when multiple access', async () => {
    await request.post(root, '/internal/saved_objects/_migrate').send({}).expect(200);

    expect(migratorInstanceMock.runMigrations).toHaveBeenCalledTimes(1);

    await request.post(root, '/internal/saved_objects/_migrate').send({}).expect(200);

    expect(migratorInstanceMock.runMigrations).toHaveBeenCalledTimes(2);
  });
});
