/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
  }),
};

export type SavedObjectsConfigType = TypeOf<typeof savedObjectsConfig.schema>;

export const savedObjectsConfig = {
  path: 'savedObjects',
  schema: schema.object({
    maxImportPayloadBytes: schema.byteSize({ defaultValue: 10485760 }),
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
