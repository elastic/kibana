/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IKibanaMigrator } from '@kbn/core-saved-objects-base-server-internal';

export type KibanaMigratorMock = jest.Mocked<IKibanaMigrator>;

export const createMigratorMock = (kibanaVersion: string = '8.0.0'): KibanaMigratorMock => {
  return {
    kibanaVersion,
    runMigrations: jest.fn(),
    prepareMigrations: jest.fn(),
    getStatus$: jest.fn(),
    getActiveMappings: jest.fn(),
    migrateDocument: jest.fn(),
  };
};
