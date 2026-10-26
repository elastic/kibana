/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  MigrateFunctionsObject,
  PersistableState,
  PersistableStateMigrateFn,
} from '@kbn/kibana-utils-plugin/common/persistable_state';
import { baseEmbeddableMigrations } from './migrate_base_input';

export const getAllMigrations = (factories: unknown[], migrateFn: PersistableStateMigrateFn) => {
  const uniqueVersions = new Set<string>();
  for (const baseMigrationVersion of Object.keys(baseEmbeddableMigrations)) {
    uniqueVersions.add(baseMigrationVersion);
  }
  for (const factory of factories) {
    const migrations = (factory as PersistableState).migrations;
    const factoryMigrations = typeof migrations === 'function' ? migrations() : migrations;
    Object.keys(factoryMigrations).forEach((version) => uniqueVersions.add(version));
  }

  const migrations: MigrateFunctionsObject = {};
  uniqueVersions.forEach((version) => {
    migrations[version] = (state) => ({
      ...migrateFn(state, version),
    });
  });

  // For backwards compatibility; some deprecated controls code included a migration for 8.7.0 which is no longer necessary.
  // but Kibana CI expects a migration for this version, so pass a no-op if one is not otherwise defined
  if (!migrations['8.7.0']) {
    migrations['8.7.0'] = (state) => ({
      ...migrateFn(state, '8.7.0'),
    });
  }

  return migrations;
};
