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
    Object.keys((factory as PersistableState).migrations).forEach((version) =>
      uniqueVersions.add(version)
    );
  }
  for (const enhancement of enhancements) {
    Object.keys((enhancement as PersistableState).migrations).forEach((version) =>
      uniqueVersions.add(version)
    );
  }

  const migrations: MigrateFunctionsObject = {};
  uniqueVersions.forEach((version) => {
    migrations[version] = (state) => ({
      ...migrateFn(state, version),
    });
  });

  return migrations;
};
