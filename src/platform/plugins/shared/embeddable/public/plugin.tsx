/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subscription } from 'rxjs';
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  PublicAppInfo,
} from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { migrateToLatest } from '@kbn/kibana-utils-plugin/common';
import { registerTriggers } from './ui_actions/register_triggers';
import { EmbeddableStateTransfer } from './state_transfer';
import { EmbeddableStateWithType, CommonEmbeddableStartContract } from '../common/types';
import {
  getExtractFunction,
  getInjectFunction,
  getMigrateFunction,
  getTelemetryFunction,
} from '../common/lib';
import { getAllMigrations } from '../common/lib/get_all_migrations';
import { setKibanaServices } from './kibana_services';
import { registerReactEmbeddableFactory } from './react_embeddable_system';
import { registerAddFromLibraryType } from './add_from_library/registry';
import { EnhancementsRegistry } from './enhancements/registry';
import {
  EmbeddableSetup,
  EmbeddableSetupDependencies,
  EmbeddableStart,
  EmbeddableStartDependencies,
} from './types';
import { preloadEmbeddableChunks } from './react_embeddable_system/react_embeddable_registry';

export class EmbeddablePublicPlugin implements Plugin<EmbeddableSetup, EmbeddableStart> {
  private stateTransferService: EmbeddableStateTransfer = {} as EmbeddableStateTransfer;
  private appList?: ReadonlyMap<string, PublicAppInfo>;
  private appListSubscription?: Subscription;
  private enhancementsRegistry = new EnhancementsRegistry();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { uiActions }: EmbeddableSetupDependencies) {
    registerTriggers(uiActions);

    return {
      registerReactEmbeddableFactory,
      registerAddFromLibraryType,
      registerEnhancement: this.enhancementsRegistry.registerEnhancement,
    };
  }

  public start(core: CoreStart, deps: EmbeddableStartDependencies): EmbeddableStart {
    this.appListSubscription = core.application.applications$.subscribe((appList) => {
      this.appList = appList;
    });

    this.stateTransferService = new EmbeddableStateTransfer(
      core.application.navigateToApp,
      core.application.currentAppId$,
      this.appList
    );

    const commonContract: CommonEmbeddableStartContract = {
      getEnhancement: this.enhancementsRegistry.getEnhancement,
    };

    const getAllMigrationsFn = () =>
      getAllMigrations(
        [],
        this.enhancementsRegistry.getEnhancements(),
        getMigrateFunction(commonContract)
      );

    const embeddableStart: EmbeddableStart = {
      preloadEmbeddableChunks,
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
}
