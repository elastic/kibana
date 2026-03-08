/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord, Serializable } from '@kbn/utility-types';

/**
 * migrate function runs the specified migration
 * @param state
 * @param version
 */
export type PersistableStateMigrateFn = (
  state: SerializableRecord,
  version: string
) => SerializableRecord;

/**
 * Collection of migrations that a given type of persistable state object has
 * accumulated over time. Migration functions are keyed using semver version
 * of Kibana releases.
 */
export interface MigrateFunctionsObject {
  [semver: string]: MigrateFunction<any, any>;
}
export type MigrateFunction<
  FromVersion extends Serializable = SerializableRecord,
  ToVersion extends Serializable = SerializableRecord
> = (state: FromVersion) => ToVersion;
