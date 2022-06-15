/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockKibanaMigrator as KibanaMigrator } from './migrate.test.mocks';
import { kibanaMigratorMock } from '../../migrations/kibana_migrator.mock';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';

describe('SavedObjects /_migrate endpoint', () => {
  let root: ReturnType<typeof kbnTestServer.createRoot>;
  const migratorInstanceMock = kibanaMigratorMock.create();

  beforeAll(() => {
    KibanaMigrator.mockReturnValue(migratorInstanceMock);
  });

  beforeEach(async () => {
    root = kbnTestServer.createRoot({
      migrations: { skip: true },
      plugins: { initialize: false },
      elasticsearch: { skipStartupConnectionCheck: true },
    });
    await root.preboot();
    await root.setup();
    await root.start();
    migratorInstanceMock.runMigrations.mockClear();
  }, 30000);

  afterEach(async () => {
    await root.shutdown();
  });

  it('calls runMigrations on the migrator with rerun=true when accessed', async () => {
    await kbnTestServer.request.post(root, '/internal/saved_objects/_migrate').send({}).expect(200);

    expect(migratorInstanceMock.runMigrations).toHaveBeenCalledTimes(1);
    expect(migratorInstanceMock.runMigrations).toHaveBeenCalledWith({ rerun: true });
  });

  it('calls runMigrations multiple time when multiple access', async () => {
    await kbnTestServer.request.post(root, '/internal/saved_objects/_migrate').send({}).expect(200);

    expect(migratorInstanceMock.runMigrations).toHaveBeenCalledTimes(1);

    await kbnTestServer.request.post(root, '/internal/saved_objects/_migrate').send({}).expect(200);

    expect(migratorInstanceMock.runMigrations).toHaveBeenCalledTimes(2);
  });
});
