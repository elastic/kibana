/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { getPersistableStateItem } from './embeddable_persistable_state_registry';
import { enhancementsPersistableState } from './enhancements/enhancements_persistable_state';
import type { EmbeddableStateWithType } from './persistable_state/types';

export const legacyEmbeddableInject = (
  state: EmbeddableStateWithType,
  references: SavedObjectReference[],
  embeddableSetup: EmbeddableSetup
) => {
  const factory = getPersistableStateItem(state.type, embeddableSetup);

  let updatedInput = state;

  if (factory) {
    updatedInput = factory.inject(updatedInput, references) as EmbeddableStateWithType;
  }

  updatedInput.enhancements = enhancementsPersistableState.inject(
    state.enhancements || {},
    references
  );

  return updatedInput;
};
