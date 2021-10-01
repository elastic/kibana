/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '../internal_types';
import type { ConfigDeprecationProvider } from '../config';

const migrationSchema = schema.object({
  batchSize: schema.number({ defaultValue: 1_000 }),
  maxBatchSizeBytes: schema.byteSize({ defaultValue: '100mb' }), // 100mb is the default http.max_content_length Elasticsearch config value
  scrollDuration: schema.string({ defaultValue: '15m' }),
  pollInterval: schema.number({ defaultValue: 1_500 }),
  skip: schema.boolean({ defaultValue: false }),
  enableV2: schema.boolean({ defaultValue: true }),
  retryAttempts: schema.number({ defaultValue: 15 }),
});

export type SavedObjectsMigrationConfigType = TypeOf<typeof migrationSchema>;

const migrationDeprecations: ConfigDeprecationProvider = () => [
  (settings, fromPath, addDeprecation) => {
    const migrationsConfig = settings[fromPath];
    if (migrationsConfig?.enableV2 !== undefined) {
      addDeprecation({
        message:
          '"migrations.enableV2" is deprecated and will be removed in an upcoming release without any further notice.',
        documentationUrl: 'https://ela.st/kbn-so-migration-v2',
        correctiveActions: {
          manualSteps: [`Remove "migrations.enableV2" from your kibana configs.`],
        },
      });
    }
    return settings;
  },
];

export const savedObjectsMigrationConfig: ServiceConfigDescriptor<SavedObjectsMigrationConfigType> =
  {
    path: 'migrations',
    schema: migrationSchema,
    deprecations: migrationDeprecations,
  };

const soSchema = schema.object({
  maxImportPayloadBytes: schema.byteSize({ defaultValue: 26_214_400 }),
  maxImportExportSize: schema.number({ defaultValue: 10_000 }),
});

export type SavedObjectsConfigType = TypeOf<typeof soSchema>;

export const savedObjectsConfig: ServiceConfigDescriptor<SavedObjectsConfigType> = {
  path: 'savedObjects',
  schema: soSchema,
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
