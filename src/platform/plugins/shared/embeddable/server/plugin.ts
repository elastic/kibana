/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import { identity } from 'lodash';
import type {
  PersistableStateService,
  PersistableStateMigrateFn,
  MigrateFunctionsObject,
  PersistableState,
} from '@kbn/kibana-utils-plugin/common';
import type { Type } from '@kbn/config-schema';
import type { EmbeddableFactoryRegistry, EmbeddableRegistryDefinition } from './types';
import type { EmbeddableStateWithType } from './persistable_state/types';
import {
  getExtractFunction,
  getInjectFunction,
  getMigrateFunction,
  getTelemetryFunction,
} from './persistable_state';
import { getAllMigrations } from './persistable_state/get_all_migrations';
import type { EmbeddableTransforms } from '../common';
import { EnhancementsRegistry } from '../common/enhancements/registry';
import type { EnhancementRegistryDefinition } from '../common/enhancements/types';

export interface EmbeddableSetup extends PersistableStateService<EmbeddableStateWithType> {
  registerEmbeddableFactory: (factory: EmbeddableRegistryDefinition) => void;
  /**
   * Use registerEmbeddableSchema to register schemas for an embeddable type.
   * Embeddable containers that include embeddable state in REST APIs, such as dashboard,
   * use this registry to include embeddable state schemas in their OpenAPI Specification (OAS) documenation.
   */
  registerEmbeddableSchema: (type: string, schema: Type<object>) => void;
  registerTransforms: (type: string, transforms: EmbeddableTransforms<any, any>) => void;
  registerEnhancement: (enhancement: EnhancementRegistryDefinition) => void;
  getAllMigrations: () => MigrateFunctionsObject;
  transformEnhancementsIn: EnhancementsRegistry['transformIn'];
  transformEnhancementsOut: EnhancementsRegistry['transformOut'];
}

export type EmbeddableStart = PersistableStateService<EmbeddableStateWithType> & {
  /**
   * Returns all embeddable schemas registered with registerEmbeddableSchema.
   */
  getEmbeddableSchemas: () => Type<object>[];

  getTransforms: (type: string) => EmbeddableTransforms | undefined;
};

export class EmbeddableServerPlugin implements Plugin<EmbeddableSetup, EmbeddableStart> {
  private readonly embeddableFactories: EmbeddableFactoryRegistry = new Map();
  private readonly embeddableSchemas: { [key: string]: Type<object> } = {};
  private enhancementsRegistry = new EnhancementsRegistry();
  private migrateFn: PersistableStateMigrateFn | undefined;
  private transformsRegistry: { [key: string]: EmbeddableTransforms<any, any> } = {};

  public setup(core: CoreSetup) {
    this.migrateFn = getMigrateFunction(
      this.getEmbeddableFactory,
      this.enhancementsRegistry.getEnhancement
    );
    return {
      registerEmbeddableFactory: this.registerEmbeddableFactory,
      registerEmbeddableSchema: (type: string, schema: Type<Object>) => {
        if (this.embeddableSchemas[type]) {
          throw new Error(`Embeddable schema already registered for type: ${type}.`);
        }
        this.embeddableSchemas[type] = schema;
      },
      registerTransforms: (type: string, transforms: EmbeddableTransforms<any, any>) => {
        if (this.transformsRegistry[type]) {
          throw new Error(`Embeddable transforms for type "${type}" are already registered.`);
        }

        this.transformsRegistry[type] = transforms;
      },
      registerEnhancement: this.enhancementsRegistry.registerEnhancement,
      transformEnhancementsIn: this.enhancementsRegistry.transformIn,
      transformEnhancementsOut: this.enhancementsRegistry.transformOut,
      telemetry: getTelemetryFunction(
        this.getEmbeddableFactory,
        this.enhancementsRegistry.getEnhancement
      ),
      extract: getExtractFunction(
        this.getEmbeddableFactory,
        this.enhancementsRegistry.getEnhancement
      ),
      inject: getInjectFunction(
        this.getEmbeddableFactory,
        this.enhancementsRegistry.getEnhancement
      ),
      getAllMigrations: () =>
        getAllMigrations(
          Array.from(this.embeddableFactories.values()),
          this.enhancementsRegistry.getEnhancements(),
          this.migrateFn!
        ),
    };
  }

  public start(core: CoreStart) {
    return {
      getEmbeddableSchemas: () => Object.values(this.embeddableSchemas),
      getTransforms: (type: string) => {
        return this.transformsRegistry[type];
      },
      telemetry: getTelemetryFunction(
        this.getEmbeddableFactory,
        this.enhancementsRegistry.getEnhancement
      ),
      extract: getExtractFunction(
        this.getEmbeddableFactory,
        this.enhancementsRegistry.getEnhancement
      ),
      inject: getInjectFunction(
        this.getEmbeddableFactory,
        this.enhancementsRegistry.getEnhancement
      ),
      getAllMigrations: () =>
        getAllMigrations(
          Array.from(this.embeddableFactories.values()),
          this.enhancementsRegistry.getEnhancements(),
          this.migrateFn!
        ),
    };
  }

  public stop() {}

  private registerEmbeddableFactory = (factory: EmbeddableRegistryDefinition) => {
    if (this.embeddableFactories.has(factory.id)) {
      throw new Error(
        `Embeddable factory [embeddableFactoryId = ${factory.id}] already registered in Embeddables API.`
      );
    }
    this.embeddableFactories.set(factory.id, {
      id: factory.id,
      telemetry: factory.telemetry || ((state, stats) => stats),
      inject: factory.inject || identity,
      extract: factory.extract || ((state: EmbeddableStateWithType) => ({ state, references: [] })),
      migrations: factory.migrations || {},
    });
  };

  private getEmbeddableFactory = (
    embeddableFactoryId: string
  ): PersistableState<EmbeddableStateWithType> => {
    return (
      this.embeddableFactories.get(embeddableFactoryId) || {
        telemetry: (
          state: EmbeddableStateWithType,
          stats: Record<string, string | number | boolean>
        ) => stats,
        inject: (state: EmbeddableStateWithType) => state,
        extract: (state: EmbeddableStateWithType) => {
          return { state, references: [] };
        },
        migrations: {},
      }
    );
  };
}
