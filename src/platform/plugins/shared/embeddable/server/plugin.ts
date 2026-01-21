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
import type { ObjectType } from '@kbn/config-schema';
import type { EmbeddableFactoryRegistry, EmbeddableRegistryDefinition } from './types';
import type { EmbeddableStateWithType } from './persistable_state/types';
import {
  getExtractFunction,
  getInjectFunction,
  getMigrateFunction,
  getTelemetryFunction,
} from './persistable_state';
import { getAllMigrations } from './persistable_state/get_all_migrations';
import type { EmbeddableTransforms, EmbeddableTransformsSetup } from '../common';
import type { DrilldownSetup } from './drilldowns/types';
import { DrilldownRegistry } from './drilldowns/registry';
import { getTransformDrilldownsIn } from '../common/drilldowns/transform_drilldowns_in';
import { getTransformDrilldownsOut } from '../common/drilldowns/transform_drilldowns_out';
import { getDrilldownsSchema } from './drilldowns/schemas';

export interface EmbeddableSetup extends PersistableStateService<EmbeddableStateWithType> {
  registerEmbeddableFactory: (factory: EmbeddableRegistryDefinition) => void;
  /*
   * Use registerDrilldown to register transforms and schema for a drilldown type.
   */
  registerDrilldown: <
    StoredState extends { type: string } = { type: string },
    State extends { type: string } = { type: string }
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
  getEmbeddableSchemas: () => ObjectType[];

  getTransforms: (type: string) => EmbeddableTransforms | undefined;
};

export class EmbeddableServerPlugin implements Plugin<EmbeddableSetup, EmbeddableStart> {
  private readonly embeddableFactories: EmbeddableFactoryRegistry = new Map();
  private migrateFn: PersistableStateMigrateFn | undefined;
  private drilldownRegistry = new DrilldownRegistry();
  private transformsRegistry: { [key: string]: EmbeddableTransformsSetup<any, any> } = {};

  public setup(core: CoreSetup) {
    this.migrateFn = getMigrateFunction(this.getEmbeddableFactory);
    return {
      registerEmbeddableFactory: this.registerEmbeddableFactory,
      registerDrilldown: this.drilldownRegistry
        .registerDrilldown as EmbeddableSetup['registerDrilldown'],
      registerTransforms: (type: string, transforms: EmbeddableTransformsSetup<any, any>) => {
        if (this.transformsRegistry[type]) {
          throw new Error(`Embeddable transforms for type "${type}" are already registered.`);
        }

        this.transformsRegistry[type] = transforms;
      },
      telemetry: getTelemetryFunction(this.getEmbeddableFactory),
      extract: getExtractFunction(this.getEmbeddableFactory),
      inject: getInjectFunction(this.getEmbeddableFactory),
      getAllMigrations: () =>
        getAllMigrations(Array.from(this.embeddableFactories.values()), this.migrateFn!),
    };
  }

  public start(core: CoreStart) {
    return {
      getEmbeddableSchemas: () =>
        Object.values(this.transformsRegistry)
          .map((transforms) =>
            transforms?.getSchema?.((embeddableSupportedTriggers: string[]) =>
              getDrilldownsSchema(this.drilldownRegistry, embeddableSupportedTriggers)
            )
          )
          .filter((schema) => Boolean(schema)) as ObjectType[],
      getTransforms: (embeddableType: string) => {
        const drilldownTransforms = {
          transformIn: getTransformDrilldownsIn(
            (drilldownType: string) =>
              this.drilldownRegistry.getDrilldown(drilldownType)?.transformIn
          ),
          transformOut: getTransformDrilldownsOut(
            (drilldownType: string) =>
              this.drilldownRegistry.getDrilldown(drilldownType)?.transformOut
          ),
        };
        return this.transformsRegistry[embeddableType]?.getTransforms?.(drilldownTransforms);
      },
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
