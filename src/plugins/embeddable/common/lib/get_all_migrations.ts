/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { baseEmbeddableMigrations } from './migrate_base_input';
import {
  MigrateFunctionsObject,
  PersistableState,
  PersistableStateMigrateFn,
} from '../../../kibana_utils/common/persistable_state';

export const getAllMigrations = (
  factories: unknown[],
  enhancements: unknown[],
  migrateFn: PersistableStateMigrateFn
) => {
  const uniqueVersions = new Set<string>();
  for (const baseMigrationVersion of Object.keys(baseEmbeddableMigrations)) {
    uniqueVersions.add(baseMigrationVersion);
  }
  for (const factory of factories) {
    const migrations = (factory as PersistableState).migrations;
    const factoryMigrations = typeof migrations === 'function' ? migrations() : migrations;
    Object.keys(factoryMigrations).forEach((version) => uniqueVersions.add(version));
  }
  for (const enhancement of enhancements) {
    const migrations = (enhancement as PersistableState).migrations;
    const enhancementMigrations = typeof migrations === 'function' ? migrations() : migrations;
    Object.keys(enhancementMigrations).forEach((version) => uniqueVersions.add(version));
  }

  const migrations: MigrateFunctionsObject = {};
  uniqueVersions.forEach((version) => {
    migrations[version] = (state) => ({
      ...migrateFn(state, version),
    });
  });

  return migrations;
};
