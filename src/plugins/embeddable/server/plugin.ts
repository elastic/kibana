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

import { CoreSetup, CoreStart, Plugin, SavedObjectReference } from 'kibana/server';
import { identity } from 'lodash';
import {
  EmbeddableFactoryRegistry,
  EnhancementsRegistry,
  EnhancementRegistryDefinition,
  EnhancementRegistryItem,
  EmbeddableRegistryDefinition,
} from './types';
import {
  extractBaseEmbeddableInput,
  injectBaseEmbeddableInput,
  telemetryBaseEmbeddableInput,
} from '../common/lib/migrate_base_input';
import { SerializableState } from '../../kibana_utils/common';
import { EmbeddableInput } from '../common/types';

export interface EmbeddableSetup {
  registerEmbeddableFactory: (factory: EmbeddableRegistryDefinition) => void;
  registerEnhancement: (enhancement: EnhancementRegistryDefinition) => void;
}

export class EmbeddableServerPlugin implements Plugin<object, object> {
  private readonly embeddableFactories: EmbeddableFactoryRegistry = new Map();
  private readonly enhancements: EnhancementsRegistry = new Map();

  public setup(core: CoreSetup) {
    return {
      registerEmbeddableFactory: this.registerEmbeddableFactory,
      registerEnhancement: this.registerEnhancement,
    };
  }

  public start(core: CoreStart) {
    return {
      telemetry: this.telemetry,
      extract: this.extract,
      inject: this.inject,
    };
  }

  public stop() {}

  private telemetry = (state: EmbeddableInput, telemetryData: Record<string, any> = {}) => {
    const enhancements: Record<string, any> = state.enhancements || {};
    const factory = this.getEmbeddableFactory(state.id);

    let telemetry = telemetryBaseEmbeddableInput(state, telemetryData);
    if (factory) {
      telemetry = factory.telemetry(state, telemetry);
    }
    Object.keys(enhancements).map((key) => {
      if (!enhancements[key]) return;
      telemetry = this.getEnhancement(key).telemetry(enhancements[key], telemetry);
    });

    return telemetry;
  };

  private extract = (state: EmbeddableInput) => {
    const enhancements = state.enhancements || {};
    const factory = this.getEmbeddableFactory(state.id);

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
      const enhancementResult = this.getEnhancement(key).extract(
        enhancements[key] as SerializableState
      );
      refs.push(...enhancementResult.references);
      updatedInput.enhancements![key] = enhancementResult.state;
    });

    return {
      state: updatedInput,
      references: refs,
    };
  };

  private inject = (state: EmbeddableInput, references: SavedObjectReference[]) => {
    const enhancements = state.enhancements || {};
    const factory = this.getEmbeddableFactory(state.id);

    let updatedInput = injectBaseEmbeddableInput(state, references);

    if (factory) {
      updatedInput = factory.inject(updatedInput, references);
    }

    updatedInput.enhancements = {};
    Object.keys(enhancements).forEach((key) => {
      if (!enhancements[key]) return;
      updatedInput.enhancements![key] = this.getEnhancement(key).inject(
        enhancements[key] as SerializableState,
        references
      );
    });

    return updatedInput;
  };

  private registerEnhancement = (enhancement: EnhancementRegistryDefinition) => {
    if (this.enhancements.has(enhancement.id)) {
      throw new Error(`enhancement with id ${enhancement.id} already exists in the registry`);
    }
    this.enhancements.set(enhancement.id, {
      id: enhancement.id,
      telemetry: enhancement.telemetry || (() => ({})),
      inject: enhancement.inject || identity,
      extract:
        enhancement.extract ||
        ((state: SerializableState) => {
          return { state, references: [] };
        }),
    });
  };

  private getEnhancement = (id: string): EnhancementRegistryItem => {
    return (
      this.enhancements.get(id) || {
        id: 'unknown',
        telemetry: () => ({}),
        inject: identity,
        extract: (state: SerializableState) => {
          return { state, references: [] };
        },
      }
    );
  };

  private registerEmbeddableFactory = (factory: EmbeddableRegistryDefinition) => {
    if (this.embeddableFactories.has(factory.id)) {
      throw new Error(
        `Embeddable factory [embeddableFactoryId = ${factory.id}] already registered in Embeddables API.`
      );
    }
    this.embeddableFactories.set(factory.id, {
      id: factory.id,
      telemetry: factory.telemetry || (() => ({})),
      inject: factory.inject || identity,
      extract: factory.extract || ((state: EmbeddableInput) => ({ state, references: [] })),
    });
  };

  private getEmbeddableFactory = (embeddableFactoryId: string) => {
    return (
      this.embeddableFactories.get(embeddableFactoryId) || {
        id: 'unknown',
        telemetry: () => ({}),
        inject: (state: EmbeddableInput) => state,
        extract: (state: EmbeddableInput) => {
          return { state, references: [] };
        },
      }
    );
  };
}
