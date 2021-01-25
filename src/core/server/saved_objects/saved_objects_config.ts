/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export type SavedObjectsMigrationConfigType = TypeOf<typeof savedObjectsMigrationConfig.schema>;

export const savedObjectsMigrationConfig = {
  path: 'migrations',
  schema: schema.object({
    batchSize: schema.number({ defaultValue: 100 }),
    scrollDuration: schema.string({ defaultValue: '15m' }),
    pollInterval: schema.number({ defaultValue: 1500 }),
    skip: schema.boolean({ defaultValue: false }),
    // TODO migrationsV2: remove/deprecate once we release migrations v2
    enableV2: schema.boolean({ defaultValue: false }),
  }),
};

export type SavedObjectsConfigType = TypeOf<typeof savedObjectsConfig.schema>;

export const savedObjectsConfig = {
  path: 'savedObjects',
  schema: schema.object({
    maxImportPayloadBytes: schema.byteSize({ defaultValue: 26214400 }),
    maxImportExportSize: schema.byteSize({ defaultValue: 10000 }),
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
    this.maxImportExportSize = rawConfig.maxImportExportSize.getValueInBytes();
    this.migration = rawMigrationConfig;
  }
}
