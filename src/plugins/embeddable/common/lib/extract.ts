/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { CommonEmbeddableStartContract, EmbeddableStateWithType } from '../types';
import { extractBaseEmbeddableInput } from './migrate_base_input';

export const getExtractFunction = (embeddables: CommonEmbeddableStartContract) => {
  return (state: EmbeddableStateWithType) => {
    const enhancements = state.enhancements || {};
    const factory = embeddables.getEmbeddableFactory(state.type);

    const baseResponse = extractBaseEmbeddableInput(state);
    let updatedInput = baseResponse.state;
    const refs = baseResponse.references;

    if (factory) {
      const factoryResponse = factory.extract(state);
      updatedInput = factoryResponse.state as EmbeddableStateWithType;
      refs.push(...factoryResponse.references);
    }

    updatedInput.enhancements = {};
    Object.keys(enhancements).forEach((key) => {
      if (!enhancements[key]) return;
      const enhancementResult = embeddables
        .getEnhancement(key)
        .extract(enhancements[key] as SerializableRecord);
      refs.push(...enhancementResult.references);
      updatedInput.enhancements![key] = enhancementResult.state;
    });

    return {
      state: updatedInput,
      references: refs,
    };
  };
};
