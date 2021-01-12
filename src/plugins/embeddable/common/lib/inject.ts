/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { CommonEmbeddableStartContract, EmbeddableStateWithType } from '../types';
import { SavedObjectReference } from '../../../../core/types';
import { injectBaseEmbeddableInput } from './migrate_base_input';
import { SerializableState } from '../../../kibana_utils/common/persistable_state';

export const getInjectFunction = (embeddables: CommonEmbeddableStartContract) => {
  return (state: EmbeddableStateWithType, references: SavedObjectReference[]) => {
    const enhancements = state.enhancements || {};
    const factory = embeddables.getEmbeddableFactory(state.type);

    let updatedInput = injectBaseEmbeddableInput(state, references);

    if (factory) {
      updatedInput = factory.inject(updatedInput, references);
    }

    updatedInput.enhancements = {};
    Object.keys(enhancements).forEach((key) => {
      if (!enhancements[key]) return;
      updatedInput.enhancements![key] = embeddables
        .getEnhancement(key)
        .inject(enhancements[key] as SerializableState, references);
    });

    return updatedInput;
  };
};
