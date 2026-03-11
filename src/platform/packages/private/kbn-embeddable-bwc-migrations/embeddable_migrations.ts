/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { PersistableState, PersistableStateMigrateFn } from '@kbn/kibana-utils-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import { type MigrateFunctionsObject } from './persistable_state';
import {
  embeddablePersistableStateRegistry,
  getPersistableStateItem,
} from './embeddable_persistable_state_registry';

export type MigrateFunction = (state: SerializableRecord, version: string) => SerializableRecord;

export const getAllMigrations = (factories: unknown[], migrateFn: PersistableStateMigrateFn) => {
  const uniqueVersions = new Set<string>();
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

export const getAllEmbeddableMigrations = (embeddableSetup: EmbeddableSetup) => {
  const migrateFn: MigrateFunction = (state: SerializableRecord, version: string) => {
    const factory = getPersistableStateItem(state.type as string, embeddableSetup);

    let updatedInput = state;

    const factoryMigrations =
      typeof factory?.migrations === 'function' ? factory?.migrations() : factory?.migrations || {};
    if (factoryMigrations[version]) {
      updatedInput = factoryMigrations[version](updatedInput);
    }

    if ('panels' in state && Array.isArray(state.panels)) {
      updatedInput.panels = (state.panels as SerializableRecord[]).map((panel) => {
        return migrateFn(panel, version);
      });
    }

    return updatedInput;
  };

  const allFactories = {
    ...Array.from(embeddableSetup.getLegacyEmbeddableFactories().values()), // TODO, remove this when all serverside embeddable factories have been removed.
    ...Object.values(embeddablePersistableStateRegistry),
  };

  return getAllMigrations(allFactories, migrateFn);
};
