/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CommonEmbeddableStartContract } from '../types';
import { baseEmbeddableMigrations } from './migrate_base_input';
import { SerializableState } from '../../../kibana_utils/common/persistable_state';

export const getMigrateFunction = (embeddables: CommonEmbeddableStartContract) => {
  return (state: SerializableState, version: string) => {
    const enhancements = (state.enhancements as SerializableState) || {};
    const factory = embeddables.getEmbeddableFactory(state.type as string);

    let updatedInput = baseEmbeddableMigrations[version]
      ? baseEmbeddableMigrations[version](state)
      : state;

    if (factory && factory.migrations[version]) {
      updatedInput = factory.migrations[version](updatedInput);
    }

    updatedInput.enhancements = {};
    Object.keys(enhancements).forEach((key) => {
      if (!enhancements[key]) return;
      (updatedInput.enhancements! as Record<string, any>)[key] = embeddables
        .getEnhancement(key)
        .migrations[version](enhancements[key] as SerializableState);
    });

    return updatedInput;
  };
};
