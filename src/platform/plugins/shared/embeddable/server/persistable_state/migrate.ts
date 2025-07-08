/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { PersistableState } from '@kbn/kibana-utils-plugin/common';
import { baseEmbeddableMigrations } from './migrate_base_input';
import { EmbeddableStateWithType } from './types';

export type MigrateFunction = (state: SerializableRecord, version: string) => SerializableRecord;

export const getMigrateFunction = (
  getEmbeddableFactory: (embeddableFactoryId: string) => PersistableState<EmbeddableStateWithType>,
  getEnhancement: (enhancementId: string) => PersistableState
) => {
  const migrateFn: MigrateFunction = (state: SerializableRecord, version: string) => {
    const enhancements = (state.enhancements as SerializableRecord) || {};
    const factory = getEmbeddableFactory?.(state.type as string);

    let updatedInput = baseEmbeddableMigrations[version]
      ? baseEmbeddableMigrations[version](state)
      : state;

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

    updatedInput.enhancements = {};
    Object.keys(enhancements).forEach((key) => {
      if (!enhancements[key]) return;
      const enhancementDefinition = getEnhancement(key);
      const enchantmentMigrations =
        typeof enhancementDefinition?.migrations === 'function'
          ? enhancementDefinition?.migrations()
          : enhancementDefinition?.migrations || {};
      const migratedEnhancement = enchantmentMigrations[version]
        ? enchantmentMigrations[version](enhancements[key] as SerializableRecord)
        : enhancements[key];
      (updatedInput.enhancements! as Record<string, {}>)[key] = migratedEnhancement;
    });

    return updatedInput;
  };

  return migrateFn;
};
