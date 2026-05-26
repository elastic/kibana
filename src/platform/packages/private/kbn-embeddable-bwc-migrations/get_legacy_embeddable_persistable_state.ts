/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { LegacyEmbeddablePresistableStateService } from './persistable_state/types';
import { legacyEmbeddableInject } from './embeddable_inject';
import { legacyEmbeddableExtract } from './embeddable_extract';
import { getAllEmbeddableMigrations } from './embeddable_migrations';

export const getLegacyEmbeddablePersistableStateService = (
  embeddableSetup: EmbeddableSetup
): LegacyEmbeddablePresistableStateService => {
  return {
    inject: (state, references) => legacyEmbeddableInject(state, references, embeddableSetup),
    extract: (state) => legacyEmbeddableExtract(state, embeddableSetup),
    getAllMigrations: () => getAllEmbeddableMigrations(embeddableSetup),
  };
};
