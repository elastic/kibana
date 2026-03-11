/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { LEGACY_VISUALIZATION_TYPE } from './legacy_visualizations/legacy_visualizations_constants';
import { legacyVisualizeEmbeddableMigrations } from './legacy_visualizations/legacy_visualizations_embeddable_migrations';
import type { LegacyEmbeddablePersistableStateItem } from './persistable_state/types';

const identityPersistableState: LegacyEmbeddablePersistableStateItem = {
  migrations: {},
  inject: (state) => state,
  extract: (state) => ({ state, references: [] }),
};

/**
 * statically maps all embeddable types to their persistable state implementations.
 */
export const embeddablePersistableStateRegistry: {
  [key: string]: LegacyEmbeddablePersistableStateItem;
} = {
  [LEGACY_VISUALIZATION_TYPE]: {
    migrations: legacyVisualizeEmbeddableMigrations,
    inject: identityPersistableState.inject, // legacy visualizations never had an inject function registered.
    extract: identityPersistableState.extract, // legacy visualizations never had an extract function registered.
  },
};

export const getPersistableStateItem = (type: string, embeddableSetup: EmbeddableSetup) =>
  embeddablePersistableStateRegistry[type] ??
  embeddableSetup.getLegacyEmbeddableFactories().get(type) ??
  {};
