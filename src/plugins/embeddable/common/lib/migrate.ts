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
