/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { PersistableState } from '@kbn/kibana-utils-plugin/common';
import { baseEmbeddableMigrations } from './migrate_base_input';
import type { EmbeddableStateWithType } from './types';

export type MigrateFunction = (state: SerializableRecord, version: string) => SerializableRecord;

export const getMigrateFunction = (
  getEmbeddableFactory: (embeddableFactoryId: string) => PersistableState<EmbeddableStateWithType>
) => {
  const migrateFn: MigrateFunction = (state: SerializableRecord, version: string) => {
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

    return updatedInput;
  };

  return migrateFn;
};
