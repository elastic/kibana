/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { MigrateFunctionsObject } from './migration_utils';
import { legacyVisualizeEmbeddableMigrations } from './legacy_visualizations/legacy_visualizations_embeddable_migrations';
import { LEGACY_VISUALIZATION_TYPE } from './legacy_visualizations/legacy_visualizations_constants';

export type MigrateFunction = (state: SerializableRecord, version: string) => SerializableRecord;

/**
 * statically maps all embeddable types to their saved object migrations.
 */
export const allEmbeddableMigrations: { [key: string]: MigrateFunctionsObject } = {
  [LEGACY_VISUALIZATION_TYPE]: legacyVisualizeEmbeddableMigrations,
};

export const getAllEmbeddableMigrations = () => {
  const migrateFn: MigrateFunction = (state: SerializableRecord, version: string) => {
    const migrations = allEmbeddableMigrations?.[state.type as string] ?? {};

    let migratedState = state;
    if (migrations[version]) {
      migratedState = migrations[version](migratedState);
    }

    if ('panels' in state && Array.isArray(state.panels)) {
      migratedState.panels = (state.panels as SerializableRecord[]).map((panel) => {
        return migrateFn(panel, version);
      });
    }

    return migratedState;
  };

  const uniqueVersions = new Set<string>();
  for (const versionMap of Object.values(allEmbeddableMigrations)) {
    Object.keys(versionMap).forEach((version) => uniqueVersions.add(version));
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
