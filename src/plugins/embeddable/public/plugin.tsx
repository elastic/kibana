/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { identity } from 'lodash';
import React from 'react';
import { Subscription } from 'rxjs';
import type { CoreSetup, CoreStart } from '../../../core/public/types';
import type { PublicAppInfo } from '../../../core/public/application/types';
import type { Plugin } from '../../../core/public/plugins/plugin';
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import type { Start as InspectorStart } from '../../inspector/public/plugin';
import { migrateToLatest } from '../../kibana_utils/common/persistable_state/migrate_to_latest';
import type { PersistableStateService } from '../../kibana_utils/common/persistable_state/types';
import { Storage } from '../../kibana_utils/public/storage/storage';
import { getSavedObjectFinder } from '../../saved_objects/public/finder/saved_object_finder';
import { showSaveModal } from '../../saved_objects/public/save_modal/show_saved_object_save_modal';
import type { UiActionsSetup, UiActionsStart } from '../../ui_actions/public/plugin';
import { getExtractFunction } from '../common/lib/extract';
import { getAllMigrations } from '../common/lib/get_all_migrations';
import { getInjectFunction } from '../common/lib/inject';
import { getMigrateFunction } from '../common/lib/migrate';
import type { SavedObjectEmbeddableInput } from '../common/lib/saved_object_embeddable';
import { getTelemetryFunction } from '../common/lib/telemetry';
import type { EmbeddableInput, EmbeddableStateWithType } from '../common/types';
import { bootstrap } from './bootstrap';
import type { AttributeServiceOptions } from './lib/attribute_service/attribute_service';
import { AttributeService, ATTRIBUTE_SERVICE_KEY } from './lib/attribute_service/attribute_service';
import { defaultEmbeddableFactoryProvider } from './lib/embeddables/default_embeddable_factory_provider';
import type { EmbeddableFactory } from './lib/embeddables/embeddable_factory';
import type { EmbeddableFactoryDefinition } from './lib/embeddables/embeddable_factory_definition';
import type { EmbeddableOutput, IEmbeddable } from './lib/embeddables/i_embeddable';
import { EmbeddablePanel } from './lib/panel/embeddable_panel';
import { EmbeddableStateTransfer } from './lib/state_transfer/embeddable_state_transfer';
import type {
  EmbeddableFactoryProvider,
  EmbeddableFactoryRegistry,
  EnhancementRegistryDefinition,
  EnhancementRegistryItem,
  EnhancementsRegistry,
} from './types';

export interface EmbeddableSetupDependencies {
  uiActions: UiActionsSetup;
}

export interface EmbeddableStartDependencies {
  uiActions: UiActionsStart;
  inspector: InspectorStart;
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
  EmbeddablePanel: EmbeddablePanelHOC;
  getStateTransfer: (storage?: Storage) => EmbeddableStateTransfer;
  getAttributeService: <
    A extends { title: string },
    V extends EmbeddableInput & { [ATTRIBUTE_SERVICE_KEY]: A } = EmbeddableInput & {
      [ATTRIBUTE_SERVICE_KEY]: A;
    },
    R extends SavedObjectEmbeddableInput = SavedObjectEmbeddableInput
  >(
    type: string,
    options: AttributeServiceOptions<A>
  ) => AttributeService<A, V, R>;
}

export type EmbeddablePanelHOC = React.FC<{ embeddable: IEmbeddable; hideHeader?: boolean }>;

export class EmbeddablePublicPlugin implements Plugin<EmbeddableSetup, EmbeddableStart> {
  private readonly embeddableFactoryDefinitions: Map<
    string,
    EmbeddableFactoryDefinition
  > = new Map();
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

  public start(
    core: CoreStart,
    { uiActions, inspector }: EmbeddableStartDependencies
  ): EmbeddableStart {
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

    const getEmbeddablePanelHoc = () => ({
      embeddable,
      hideHeader,
    }: {
      embeddable: IEmbeddable;
      hideHeader?: boolean;
    }) => (
      <EmbeddablePanel
        hideHeader={hideHeader}
        embeddable={embeddable}
        stateTransfer={this.stateTransferService}
        getActions={uiActions.getTriggerCompatibleActions}
        getEmbeddableFactory={this.getEmbeddableFactory}
        getAllEmbeddableFactories={this.getEmbeddableFactories}
        overlays={core.overlays}
        notifications={core.notifications}
        application={core.application}
        inspector={inspector}
        SavedObjectFinder={getSavedObjectFinder(core.savedObjects, core.uiSettings)}
      />
    );

    const commonContract = {
      getEmbeddableFactory: this.getEmbeddableFactory,
      getEnhancement: this.getEnhancement,
    };

    const getAllMigrationsFn = () =>
      getAllMigrations(
        Array.from(this.embeddableFactories.values()),
        Array.from(this.enhancements.values()),
        getMigrateFunction(commonContract)
      );

    return {
      getEmbeddableFactory: this.getEmbeddableFactory,
      getEmbeddableFactories: this.getEmbeddableFactories,
      getAttributeService: (type: string, options) =>
        new AttributeService(
          type,
          showSaveModal,
          core.i18n.Context,
          core.notifications.toasts,
          options,
          this.getEmbeddableFactory
        ),
      getStateTransfer: (storage?: Storage) =>
        storage
          ? new EmbeddableStateTransfer(
              core.application.navigateToApp,
              core.application.currentAppId$,
              this.appList,
              storage
            )
          : this.stateTransferService,
      EmbeddablePanel: getEmbeddablePanelHoc(),
      telemetry: getTelemetryFunction(commonContract),
      extract: getExtractFunction(commonContract),
      inject: getInjectFunction(commonContract),
      getAllMigrations: getAllMigrationsFn,
      migrateToLatest: (state) => {
        return migrateToLatest(getAllMigrationsFn(), state) as EmbeddableStateWithType;
      },
    };
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
      telemetry: enhancement.telemetry || (() => ({})),
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
