/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { valid } from 'semver';
import { schema, TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import buffer from 'buffer';

const migrationSchema = schema.object({
  algorithm: schema.oneOf([schema.literal('v2'), schema.literal('zdt')], {
    defaultValue: 'v2',
  }),
  batchSize: schema.number({ defaultValue: 1_000 }),
  maxBatchSizeBytes: schema.byteSize({ defaultValue: '100mb' }), // 100mb is the default http.max_content_length Elasticsearch config value
  maxReadBatchSizeBytes: schema.byteSize({
    defaultValue: buffer.constants.MAX_STRING_LENGTH,
    max: buffer.constants.MAX_STRING_LENGTH,
  }),
  discardUnknownObjects: schema.maybe(
    schema.string({
      validate: (value: string) =>
        valid(value) ? undefined : 'The value is not a valid semantic version',
    })
  ),
  discardCorruptObjects: schema.maybe(
    schema.string({
      validate: (value: string) =>
        valid(value) ? undefined : 'The value is not a valid semantic version',
    })
  ),
  scrollDuration: schema.string({ defaultValue: '15m' }),
  pollInterval: schema.number({ defaultValue: 1_500 }),
  skip: schema.boolean({ defaultValue: false }),
  retryAttempts: schema.number({ defaultValue: 15 }),
  /**
   * ZDT algorithm specific options
   */
  zdt: schema.object({
    /**
     * The delay that the migrator will wait for, in seconds, when updating the
     * index mapping's meta to let the other nodes pickup the changes.
     */
    metaPickupSyncDelaySec: schema.number({ min: 1, defaultValue: 5 }),
    /**
     * The document migration phase will be run from instances with any of the specified roles.
     *
     * This is mostly used for testing environments and integration tests were
     * we have full control over a single node Kibana deployment.
     *
     * Defaults to ["migrator"]
     */
    runOnRoles: schema.arrayOf(schema.string(), { defaultValue: ['migrator'] }),
  }),
});

export type SavedObjectsMigrationConfigType = TypeOf<typeof migrationSchema>;

export const savedObjectsMigrationConfig: ServiceConfigDescriptor<SavedObjectsMigrationConfigType> =
  {
    path: 'migrations',
    schema: migrationSchema,
  };

const soSchema = schema.object({
  maxImportPayloadBytes: schema.byteSize({ defaultValue: 26_214_400 }),
  maxImportExportSize: schema.number({ defaultValue: 10_000 }),
  /* @internal Conditionally set default, dependening on if kibana's running from a dist build or not */
  allowHttpApiAccess: schema.conditional(
    schema.contextRef('dist'),
    true,
    schema.boolean({ defaultValue: true }),
    schema.boolean({ defaultValue: false })
  ),
});

export type SavedObjectsConfigType = TypeOf<typeof soSchema>;

export const savedObjectsConfig: ServiceConfigDescriptor<SavedObjectsConfigType> = {
  path: 'savedObjects',
  schema: soSchema,
};

export class SavedObjectConfig {
  public maxImportPayloadBytes: number;
  public maxImportExportSize: number;
  /* @internal depend on env: see https://github.com/elastic/dev/issues/2200 */
  public allowHttpApiAccess: boolean;
  public migration: SavedObjectsMigrationConfigType;

  constructor(
    rawConfig: SavedObjectsConfigType,
    rawMigrationConfig: SavedObjectsMigrationConfigType
  ) {
    this.maxImportPayloadBytes = rawConfig.maxImportPayloadBytes.getValueInBytes();
    this.maxImportExportSize = rawConfig.maxImportExportSize;
    this.migration = rawMigrationConfig;
    this.allowHttpApiAccess = rawConfig.allowHttpApiAccess;
  }
}
