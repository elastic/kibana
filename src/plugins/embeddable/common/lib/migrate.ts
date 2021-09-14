/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { CommonEmbeddableStartContract } from '../types';
import { baseEmbeddableMigrations } from './migrate_base_input';

export type MigrateFunction = (state: SerializableRecord, version: string) => SerializableRecord;

export const getMigrateFunction = (embeddables: CommonEmbeddableStartContract) => {
  const migrateFn: MigrateFunction = (state: SerializableRecord, version: string) => {
    const enhancements = (state.enhancements as SerializableRecord) || {};
    const factory = embeddables.getEmbeddableFactory(state.type as string);

    let updatedInput = baseEmbeddableMigrations[version]
      ? baseEmbeddableMigrations[version](state)
      : state;

    if (factory?.migrations[version]) {
      updatedInput = factory.migrations[version](updatedInput);
    }

    if (factory?.isContainerType) {
      updatedInput.panels = ((state.panels as SerializableRecord[]) || []).map((panel) => {
        return migrateFn(panel, version);
      });
    }

    updatedInput.enhancements = {};
    Object.keys(enhancements).forEach((key) => {
      if (!enhancements[key]) return;
      const enhancementDefinition = embeddables.getEnhancement(key);
      const migratedEnhancement = enhancementDefinition?.migrations?.[version]
        ? enhancementDefinition.migrations[version](enhancements[key] as SerializableRecord)
        : enhancements[key];
      (updatedInput.enhancements! as Record<string, any>)[key] = migratedEnhancement;
    });

    return updatedInput;
  };

  return migrateFn;
};
