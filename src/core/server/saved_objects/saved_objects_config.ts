/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export type SavedObjectsMigrationConfigType = TypeOf<typeof savedObjectsMigrationConfig.schema>;

export const savedObjectsMigrationConfig = {
  path: 'migrations',
  schema: schema.object({
    batchSize: schema.number({ defaultValue: 1000 }),
    scrollDuration: schema.string({ defaultValue: '15m' }),
    pollInterval: schema.number({ defaultValue: 1500 }),
    skip: schema.boolean({ defaultValue: false }),
    // TODO migrationsV2: remove/deprecate once we release migrations v2
    enableV2: schema.boolean({ defaultValue: true }),
    /** the number of times v2 migrations will retry temporary failures such as a timeout, 503 status code or snapshot_in_progress_exception */
    retryAttempts: schema.number({ defaultValue: 15 }),
  }),
};

export type SavedObjectsConfigType = TypeOf<typeof savedObjectsConfig.schema>;

export const savedObjectsConfig = {
  path: 'savedObjects',
  schema: schema.object({
    maxImportPayloadBytes: schema.byteSize({ defaultValue: 26_214_400 }),
    maxImportExportSize: schema.number({ defaultValue: 10_000 }),
  }),
};

export class SavedObjectConfig {
  public maxImportPayloadBytes: number;
  public maxImportExportSize: number;

  public migration: SavedObjectsMigrationConfigType;

  constructor(
    rawConfig: SavedObjectsConfigType,
    rawMigrationConfig: SavedObjectsMigrationConfigType
  ) {
    this.maxImportPayloadBytes = rawConfig.maxImportPayloadBytes.getValueInBytes();
    this.maxImportExportSize = rawConfig.maxImportExportSize;
    this.migration = rawMigrationConfig;
  }
}
