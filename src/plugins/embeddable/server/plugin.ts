/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from 'kibana/server';
import { identity } from 'lodash';
import {
  EmbeddableFactoryRegistry,
  EnhancementsRegistry,
  EnhancementRegistryDefinition,
  EnhancementRegistryItem,
  EmbeddableRegistryDefinition,
} from './types';
import {
  getExtractFunction,
  getInjectFunction,
  getMigrateFunction,
  getTelemetryFunction,
} from '../common/lib';
import { PersistableStateService, SerializableState } from '../../kibana_utils/common';
import { EmbeddableStateWithType } from '../common/types';

export interface EmbeddableSetup extends PersistableStateService<EmbeddableStateWithType> {
  registerEmbeddableFactory: (factory: EmbeddableRegistryDefinition) => void;
  registerEnhancement: (enhancement: EnhancementRegistryDefinition) => void;
}

export type EmbeddableStart = PersistableStateService<EmbeddableStateWithType>;

export class EmbeddableServerPlugin implements Plugin<EmbeddableSetup, EmbeddableStart> {
  private readonly embeddableFactories: EmbeddableFactoryRegistry = new Map();
  private readonly enhancements: EnhancementsRegistry = new Map();

  public setup(core: CoreSetup) {
    const commonContract = {
      getEmbeddableFactory: this.getEmbeddableFactory,
      getEnhancement: this.getEnhancement,
    };
    return {
      registerEmbeddableFactory: this.registerEmbeddableFactory,
      registerEnhancement: this.registerEnhancement,
      telemetry: getTelemetryFunction(commonContract),
      extract: getExtractFunction(commonContract),
      inject: getInjectFunction(commonContract),
      migrate: getMigrateFunction(commonContract),
    };
  }

  public start(core: CoreStart) {
    const commonContract = {
      getEmbeddableFactory: this.getEmbeddableFactory,
      getEnhancement: this.getEnhancement,
    };

    return {
      telemetry: getTelemetryFunction(commonContract),
      extract: getExtractFunction(commonContract),
      inject: getInjectFunction(commonContract),
      migrate: getMigrateFunction(commonContract),
    };
  }

  public stop() {}

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
      migrations: enhancement.migrations || {},
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
        migrations: {},
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
      extract: factory.extract || ((state: EmbeddableStateWithType) => ({ state, references: [] })),
      migrations: factory.migrations || {},
    });
  };

  private getEmbeddableFactory = (embeddableFactoryId: string) => {
    return (
      this.embeddableFactories.get(embeddableFactoryId) || {
        id: 'unknown',
        telemetry: () => ({}),
        inject: (state: EmbeddableStateWithType) => state,
        extract: (state: EmbeddableStateWithType) => {
          return { state, references: [] };
        },
        migrations: {},
      }
    );
  };
}
