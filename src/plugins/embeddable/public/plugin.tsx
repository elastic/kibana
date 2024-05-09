/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subscription } from 'rxjs';
import { identity } from 'lodash';
import type { SerializableRecord } from '@kbn/utility-types';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { Start as InspectorStart } from '@kbn/inspector-plugin/public';
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  PublicAppInfo,
} from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { migrateToLatest, PersistableStateService } from '@kbn/kibana-utils-plugin/common';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import {
  EmbeddableFactoryRegistry,
  EmbeddableFactoryProvider,
  EnhancementsRegistry,
  EnhancementRegistryDefinition,
  EnhancementRegistryItem,
} from './types';
import { bootstrap } from './bootstrap';
import {
  EmbeddableFactory,
  EmbeddableInput,
  EmbeddableOutput,
  defaultEmbeddableFactoryProvider,
  IEmbeddable,
  SavedObjectEmbeddableInput,
} from './lib';
import { EmbeddableFactoryDefinition } from './lib/embeddables/embeddable_factory_definition';
import { EmbeddableStateTransfer } from './lib/state_transfer';
import { ATTRIBUTE_SERVICE_KEY, AttributeService } from './lib/attribute_service';
import { AttributeServiceOptions } from './lib/attribute_service/attribute_service';
import { EmbeddableStateWithType, CommonEmbeddableStartContract } from '../common/types';
import {
  getExtractFunction,
  getInjectFunction,
  getMigrateFunction,
  getTelemetryFunction,
} from '../common/lib';
import { getAllMigrations } from '../common/lib/get_all_migrations';
import { setKibanaServices } from './kibana_services';

export interface EmbeddableSetupDependencies {
  uiActions: UiActionsSetup;
}

export interface EmbeddableStartDependencies {
  uiActions: UiActionsStart;
  inspector: InspectorStart;
  usageCollection: UsageCollectionStart;
  contentManagement: ContentManagementPublicStart;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
}

export interface EmbeddableSetup {
  registerEmbeddableFactory: <
    I extends EmbeddableInput,
    O extends EmbeddableOutput,
    E extends IEmbeddable<I, O> = IEmbeddable<I, O>
  >(
    id: string,
    factory: EmbeddableFactoryDefinition<I, O, E>
  ) => () => EmbeddableFactory<I, O, E>;
  registerEnhancement: (enhancement: EnhancementRegistryDefinition) => void;
  setCustomEmbeddableFactoryProvider: (customProvider: EmbeddableFactoryProvider) => void;
}

export interface EmbeddableStart extends PersistableStateService<EmbeddableStateWithType> {
  getEmbeddableFactory: <
    I extends EmbeddableInput = EmbeddableInput,
    O extends EmbeddableOutput = EmbeddableOutput,
    E extends IEmbeddable<I, O> = IEmbeddable<I, O>
  >(
    embeddableFactoryId: string
  ) => EmbeddableFactory<I, O, E> | undefined;
  getEmbeddableFactories: () => IterableIterator<EmbeddableFactory>;
  getStateTransfer: (storage?: Storage) => EmbeddableStateTransfer;
  getAttributeService: <
    A extends { title: string },
    V extends EmbeddableInput & {
      [ATTRIBUTE_SERVICE_KEY]: A;
    } = EmbeddableInput & {
      [ATTRIBUTE_SERVICE_KEY]: A;
    },
    R extends SavedObjectEmbeddableInput = SavedObjectEmbeddableInput,
    M extends unknown = unknown
  >(
    type: string,
    options: AttributeServiceOptions<A, M>
  ) => AttributeService<A, V, R, M>;
}
export class EmbeddablePublicPlugin implements Plugin<EmbeddableSetup, EmbeddableStart> {
  private readonly embeddableFactoryDefinitions: Map<string, EmbeddableFactoryDefinition> =
    new Map();
  private readonly embeddableFactories: EmbeddableFactoryRegistry = new Map();
  private readonly enhancements: EnhancementsRegistry = new Map();
  private customEmbeddableFactoryProvider?: EmbeddableFactoryProvider;
  private stateTransferService: EmbeddableStateTransfer = {} as EmbeddableStateTransfer;
  private isRegistryReady = false;
  private appList?: ReadonlyMap<string, PublicAppInfo>;
  private appListSubscription?: Subscription;

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { uiActions }: EmbeddableSetupDependencies) {
    bootstrap(uiActions);

    return {
      registerEmbeddableFactory: this.registerEmbeddableFactory,
      registerEnhancement: this.registerEnhancement,
      setCustomEmbeddableFactoryProvider: (provider: EmbeddableFactoryProvider) => {
        if (this.customEmbeddableFactoryProvider) {
          throw new Error(
            'Custom embeddable factory provider is already set, and can only be set once'
          );
        }
        this.customEmbeddableFactoryProvider = provider;
      },
    };
  }

  public start(core: CoreStart, deps: EmbeddableStartDependencies): EmbeddableStart {
    this.embeddableFactoryDefinitions.forEach((def) => {
      this.embeddableFactories.set(
        def.type,
        this.customEmbeddableFactoryProvider
          ? this.customEmbeddableFactoryProvider(def)
          : defaultEmbeddableFactoryProvider(def)
      );
    });

    this.appListSubscription = core.application.applications$.subscribe((appList) => {
      this.appList = appList;
    });

    this.stateTransferService = new EmbeddableStateTransfer(
      core.application.navigateToApp,
      core.application.currentAppId$,
      this.appList
    );
    this.isRegistryReady = true;

    const commonContract: CommonEmbeddableStartContract = {
      getEmbeddableFactory: this
        .getEmbeddableFactory as unknown as CommonEmbeddableStartContract['getEmbeddableFactory'],
      getEnhancement: this.getEnhancement,
    };

    const getAllMigrationsFn = () =>
      getAllMigrations(
        Array.from(this.embeddableFactories.values()),
        Array.from(this.enhancements.values()),
        getMigrateFunction(commonContract)
      );

    const embeddableStart: EmbeddableStart = {
      getEmbeddableFactory: this.getEmbeddableFactory,
      getEmbeddableFactories: this.getEmbeddableFactories,
      getAttributeService: (type: string, options) =>
        new AttributeService(type, core.notifications.toasts, options, this.getEmbeddableFactory),
      getStateTransfer: (storage?: Storage) =>
        storage
          ? new EmbeddableStateTransfer(
              core.application.navigateToApp,
              core.application.currentAppId$,
              this.appList,
              storage
            )
          : this.stateTransferService,
      telemetry: getTelemetryFunction(commonContract),
      extract: getExtractFunction(commonContract),
      inject: getInjectFunction(commonContract),
      getAllMigrations: getAllMigrationsFn,
      migrateToLatest: (state) => {
        return migrateToLatest(getAllMigrationsFn(), state) as EmbeddableStateWithType;
      },
    };

    setKibanaServices(core, embeddableStart, deps);
    return embeddableStart;
  }

  public stop() {
    if (this.appListSubscription) {
      this.appListSubscription.unsubscribe();
    }
  }

  private registerEnhancement = (enhancement: EnhancementRegistryDefinition) => {
    if (this.enhancements.has(enhancement.id)) {
      throw new Error(`enhancement with id ${enhancement.id} already exists in the registry`);
    }
    this.enhancements.set(enhancement.id, {
      id: enhancement.id,
      telemetry: enhancement.telemetry || ((state, stats) => stats),
      inject: enhancement.inject || identity,
      extract:
        enhancement.extract ||
        ((state: SerializableRecord) => {
          return { state, references: [] };
        }),
      migrations: enhancement.migrations || {},
    });
  };

  private getEnhancement = (id: string): EnhancementRegistryItem => {
    return (
      this.enhancements.get(id) || {
        id: 'unknown',
        telemetry: (state, stats) => stats,
        inject: identity,
        extract: (state: SerializableRecord) => {
          return { state, references: [] };
        },
        migrations: {},
      }
    );
  };

  private getEmbeddableFactories = () => {
    this.ensureFactoriesExist();
    return this.embeddableFactories.values();
  };

  private registerEmbeddableFactory = <
    I extends EmbeddableInput = EmbeddableInput,
    O extends EmbeddableOutput = EmbeddableOutput,
    E extends IEmbeddable<I, O> = IEmbeddable<I, O>
  >(
    embeddableFactoryId: string,
    factory: EmbeddableFactoryDefinition<I, O, E>
  ): (() => EmbeddableFactory<I, O, E>) => {
    if (this.embeddableFactoryDefinitions.has(embeddableFactoryId)) {
      throw new Error(
        `Embeddable factory [embeddableFactoryId = ${embeddableFactoryId}] already registered in Embeddables API.`
      );
    }
    this.embeddableFactoryDefinitions.set(embeddableFactoryId, factory);

    return () => {
      return this.getEmbeddableFactory(embeddableFactoryId);
    };
  };

  private getEmbeddableFactory = <
    I extends EmbeddableInput = EmbeddableInput,
    O extends EmbeddableOutput = EmbeddableOutput,
    E extends IEmbeddable<I, O> = IEmbeddable<I, O>
  >(
    embeddableFactoryId: string
  ): EmbeddableFactory<I, O, E> => {
    if (!this.isRegistryReady) {
      throw new Error('Embeddable factories can only be retrieved after setup lifecycle.');
    }
    this.ensureFactoryExists(embeddableFactoryId);
    const factory = this.embeddableFactories.get(embeddableFactoryId);

    return factory as EmbeddableFactory<I, O, E>;
  };

  // These two functions are only to support legacy plugins registering factories after the start lifecycle.
  private ensureFactoriesExist = () => {
    this.embeddableFactoryDefinitions.forEach((def) => this.ensureFactoryExists(def.type));
  };

  private ensureFactoryExists = (type: string) => {
    if (!this.embeddableFactories.get(type)) {
      const def = this.embeddableFactoryDefinitions.get(type);
      if (!def) return;
      this.embeddableFactories.set(
        type,
        this.customEmbeddableFactoryProvider
          ? this.customEmbeddableFactoryProvider(def)
          : defaultEmbeddableFactoryProvider(def)
      );
    }
  };
}
