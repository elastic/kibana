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
import type { ObjectType, Type } from '@kbn/config-schema';
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
import type { DrilldownSetup, DrilldownState } from './drilldowns/types';
import { getDrilldownRegistry } from './drilldowns/registry';
import type { EmbeddableTransformsSetup } from './embeddable_transforms/types';
import { getTransformsRegistry } from './embeddable_transforms/registry';

export interface EmbeddableSetup extends PersistableStateService<EmbeddableStateWithType> {
  registerEmbeddableFactory: (factory: EmbeddableRegistryDefinition) => void;
  /*
   * Use registerDrilldown to register transforms and schema for a drilldown type.
   */
  registerDrilldown: <
    StoredState extends DrilldownState = DrilldownState,
    State extends DrilldownState = DrilldownState
  >(
    type: string,
    drilldown: DrilldownSetup<StoredState, State>
  ) => void;
  /*
   * Use registerTransforms to register transforms and schema for an embeddable type.
   * Transforms decouple REST API state from stored state,
   * allowing embeddables to have one shape for REST APIs and another for storage.
   * Embeddable containers, such as dashboard, use transforms to convert EmbeddableState into StoreEmbeddableState and vice versa.
   * On read, transformOut is used to convert StoredEmbeddableState and inject references into EmbeddableState.
   * On write, transformIn is used to extract references and convert EmbeddableState into StoredEmbeddableState.
   */
  registerTransforms: (type: string, transforms: EmbeddableTransformsSetup<any, any>) => void;
  getAllMigrations: () => MigrateFunctionsObject;
}

export type EmbeddableStart = PersistableStateService<EmbeddableStateWithType> & {
  /**
   * Returns all embeddable schemas registered with registerTransforms.
   */
  getAllEmbeddableSchemas: () => ObjectType[];

  getTransforms: (type: string) =>
    | (EmbeddableTransforms & {
        schema?: Type<object>;
        throwOnUnmappedPanel?: EmbeddableTransformsSetup['throwOnUnmappedPanel'];
      })
    | undefined;
};

export class EmbeddableServerPlugin implements Plugin<EmbeddableSetup, EmbeddableStart> {
  private readonly embeddableFactories: EmbeddableFactoryRegistry = new Map();
  private migrateFn: PersistableStateMigrateFn | undefined;
  private drilldownRegistry = getDrilldownRegistry();
  private transformsRegistry = getTransformsRegistry(this.drilldownRegistry);

  public setup(core: CoreSetup) {
    this.migrateFn = getMigrateFunction(this.getEmbeddableFactory);
    return {
      registerEmbeddableFactory: this.registerEmbeddableFactory,
      registerDrilldown: this.drilldownRegistry
        .registerDrilldown as EmbeddableSetup['registerDrilldown'],
      registerTransforms: this.transformsRegistry.registerTransforms,
      telemetry: getTelemetryFunction(this.getEmbeddableFactory),
      extract: getExtractFunction(this.getEmbeddableFactory),
      inject: getInjectFunction(this.getEmbeddableFactory),
      getAllMigrations: () =>
        getAllMigrations(Array.from(this.embeddableFactories.values()), this.migrateFn!),
    };
  }

  public start(core: CoreStart) {
    return {
      getAllEmbeddableSchemas: this.transformsRegistry.getAllEmbeddableSchemas,
      getTransforms: this.transformsRegistry.getEmbeddableTransforms,
      telemetry: getTelemetryFunction(this.getEmbeddableFactory),
      extract: getExtractFunction(this.getEmbeddableFactory),
      inject: getInjectFunction(this.getEmbeddableFactory),
      getAllMigrations: () =>
        getAllMigrations(Array.from(this.embeddableFactories.values()), this.migrateFn!),
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
