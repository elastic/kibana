/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/types';
import type { PersistableState } from '@kbn/kibana-utils-plugin/common';
import { enhancementsPersistableState } from '../../common/bwc/enhancements/enhancements_persistable_state';
import type { EmbeddableStateWithType } from './types';
import { injectBaseEmbeddableInput } from './migrate_base_input';

export const getInjectFunction = (
  getEmbeddableFactory: (embeddableFactoryId: string) => PersistableState<EmbeddableStateWithType>
) => {
  return (state: EmbeddableStateWithType, references: SavedObjectReference[]) => {
    const factory = getEmbeddableFactory(state.type);

    let updatedInput = injectBaseEmbeddableInput(state, references);

    if (factory) {
      updatedInput = factory.inject(updatedInput, references) as EmbeddableStateWithType;
    }

    updatedInput.enhancements = enhancementsPersistableState.inject(
      state.enhancements || {},
      references
    );

    return updatedInput;
  };
};
