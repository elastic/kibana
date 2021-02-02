/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CommonEmbeddableStartContract, EmbeddableStateWithType } from '../types';
import { extractBaseEmbeddableInput } from './migrate_base_input';
import { SerializableState } from '../../../kibana_utils/common/persistable_state';

export const getExtractFunction = (embeddables: CommonEmbeddableStartContract) => {
  return (state: EmbeddableStateWithType) => {
    const enhancements = state.enhancements || {};
    const factory = embeddables.getEmbeddableFactory(state.type);

    const baseResponse = extractBaseEmbeddableInput(state);
    let updatedInput = baseResponse.state;
    const refs = baseResponse.references;

    if (factory) {
      const factoryResponse = factory.extract(state);
      updatedInput = factoryResponse.state;
      refs.push(...factoryResponse.references);
    }

    updatedInput.enhancements = {};
    Object.keys(enhancements).forEach((key) => {
      if (!enhancements[key]) return;
      const enhancementResult = embeddables
        .getEnhancement(key)
        .extract(enhancements[key] as SerializableState);
      refs.push(...enhancementResult.references);
      updatedInput.enhancements![key] = enhancementResult.state;
    });

    return {
      state: updatedInput,
      references: refs,
    };
  };
};
