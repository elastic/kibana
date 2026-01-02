/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PersistableState } from '@kbn/kibana-utils-plugin/common';
import { enhancementsPersistableState } from '../../common/bwc/enhancements/enhancements_persistable_state';
import type { EmbeddableStateWithType } from './types';
import { extractBaseEmbeddableInput } from './migrate_base_input';

export const getExtractFunction = (
  getEmbeddableFactory: (embeddableFactoryId: string) => PersistableState<EmbeddableStateWithType>
) => {
  return (state: EmbeddableStateWithType) => {
    const factory = getEmbeddableFactory(state.type);

    const baseResponse = extractBaseEmbeddableInput(state);
    let updatedInput = baseResponse.state;
    const refs = baseResponse.references;

    if (factory) {
      const factoryResponse = factory.extract(state);
      updatedInput = factoryResponse.state as EmbeddableStateWithType;
      refs.push(...factoryResponse.references);
    }

    const enhancementResult = enhancementsPersistableState.extract(state.enhancements || {});
    refs.push(...enhancementResult.references);
    updatedInput.enhancements = enhancementResult.state;

    return {
      state: updatedInput,
      references: refs,
    };
  };
};
