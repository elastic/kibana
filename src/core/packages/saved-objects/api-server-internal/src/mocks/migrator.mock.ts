/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mocked } from 'vitest';
import type {
  IKibanaMigrator,
  IDocumentMigrator,
} from '@kbn/core-saved-objects-base-server-internal';

export type KibanaMigratorMock = Mocked<IKibanaMigrator>;

export const createMigratorMock = (kibanaVersion: string = '8.0.0'): KibanaMigratorMock => {
  return {
    kibanaVersion,
    runMigrations: vi.fn(),
    prepareMigrations: vi.fn(),
    getStatus$: vi.fn(),
    getActiveMappings: vi.fn(),
    migrateDocument: vi.fn(),
    getDocumentMigrator: vi.fn().mockReturnValue(createDocumentMigratorMock()),
  };
};

export type DocumentMigratorMock = Mocked<IDocumentMigrator>;

export const createDocumentMigratorMock = (): DocumentMigratorMock => {
  return {
    migrate: vi.fn().mockImplementation((doc: unknown) => doc),
    migrateAndConvert: vi.fn().mockImplementation((doc: unknown) => doc),
    isDowngradeRequired: vi.fn().mockReturnValue(false),
  };
};
