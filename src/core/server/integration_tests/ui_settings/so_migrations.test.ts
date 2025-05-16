/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createTestHarness, SavedObjectTestHarness } from '../../../test_helpers/so_migrations';

/**
 * These tests are a little unnecessary because these migrations are incredibly simple, however
 * this file serves as an example of how to use test_helpers/so_migrations.
 */
describe('ui settings migrations', () => {
  let testHarness: SavedObjectTestHarness;

  beforeAll(async () => {
    testHarness = createTestHarness();
    await testHarness.start();
  });

  afterAll(async () => {
    await testHarness.stop();
  });

  it('migrates siem:* configs', async () => {
    const input = [
      {
        type: 'config',
        id: '1',
        attributes: {
          'siem:value-one': 1000,
          'siem:value-two': 'hello',
        },
        references: [],
      },
    ];
    expect(await testHarness.migrate(input)).toEqual([
      expect.objectContaining({
        type: 'config',
        id: '1',
        attributes: {
          'securitySolution:value-one': 1000,
          'securitySolution:value-two': 'hello',
        },
        references: [],
      }),
    ]);
  });

  it('migrates ml:fileDataVisualizerMaxFileSize', async () => {
    const input = [
      {
        type: 'config',
        id: '1',
        attributes: { 'ml:fileDataVisualizerMaxFileSize': '1000' },
        // This field can be added if you only want this object to go through the > 7.12.0 migrations
        // If this field is omitted the object will be run through all migrations available.
        migrationVersion: { config: '7.12.0' },
        references: [],
      },
    ];
    expect(await testHarness.migrate(input)).toEqual([
      expect.objectContaining({
        type: 'config',
        id: '1',
        attributes: { 'fileUpload:maxFileSize': '1000' },
        references: [],
      }),
    ]);
  });
});
