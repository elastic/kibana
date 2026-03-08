/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { EmbeddableStateWithType } from './dashboards/migrations/types';
import { LEGACY_VISUALIZATION_TYPE } from './legacy_visualizations/legacy_visualizations_constants';

export interface EmbeddableReferenceManagers {
  [key: string]: EmbeddableReferenceManager;
}

export interface EmbeddableReferenceManager {
  /**
   * A function which receives state and a list of references and should return
   * back the state with references injected. The default is an identity
   * function.
   *
   * @param state The persistable state serializable state object.
   * @param references List of saved object references.
   * @returns Persistable state object with references injected.
   */
  inject(
    state: EmbeddableStateWithType,
    references: SavedObjectReference[]
  ): EmbeddableStateWithType;

  /**
   * A function which receives state and should return the state with references
   * extracted and an array of the extracted references. The default case could
   * simply return the same state with an empty array of references.
   *
   * @param state The persistable state serializable state object.
   * @returns Persistable state object with references extracted and a list of
   *          references.
   */
  extract(state: EmbeddableStateWithType): {
    state: EmbeddableStateWithType;
    references: SavedObjectReference[];
  };
}

const identityReferenceManager: EmbeddableReferenceManager = {
  inject: (state) => state,
  extract: (state) => ({ state, references: [] }),
};

export const getAllEmbeddableReferenceManagers = (): EmbeddableReferenceManagers => ({
  [LEGACY_VISUALIZATION_TYPE]: identityReferenceManager, // legacy visualizations never had extract / inject functions registered.
});
