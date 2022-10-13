/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { SavedObjectReference } from '@kbn/core/types';
import { CommonEmbeddableStartContract, EmbeddableStateWithType } from '../types';
import { injectBaseEmbeddableInput } from './migrate_base_input';

export const getInjectFunction = (embeddables: CommonEmbeddableStartContract) => {
  return (state: EmbeddableStateWithType, references: SavedObjectReference[]) => {
    const enhancements = state.enhancements || {};
    const factory = embeddables.getEmbeddableFactory(state.type);

    let updatedInput = injectBaseEmbeddableInput(state, references);

    if (factory) {
      updatedInput = factory.inject(updatedInput, references) as EmbeddableStateWithType;
    }

    updatedInput.enhancements = {};
    Object.keys(enhancements).forEach((key) => {
      if (!enhancements[key]) return;
      updatedInput.enhancements![key] = embeddables
        .getEnhancement(key)
        .inject(enhancements[key] as SerializableRecord, references);
    });

    return updatedInput;
  };
};
