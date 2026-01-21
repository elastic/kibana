/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Subscription } from 'rxjs';
import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  PublicAppInfo,
} from '@kbn/core/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { registerTriggers } from './ui_actions/register_triggers';
import { EmbeddableStateTransfer } from './state_transfer';
import { setKibanaServices } from './kibana_services';
import { registerReactEmbeddableFactory } from './react_embeddable_system';
import { registerAddFromLibraryType } from './add_from_library/registry';
import type {
  EmbeddableSetup,
  EmbeddableSetupDependencies,
  EmbeddableStart,
  EmbeddableStartDependencies,
} from './types';
import {
  registerLegacyURLTransform,
  hasLegacyURLTransform,
  getLegacyURLTransform,
} from './transforms_registry';
import { enhancementsPersistableState } from '../common/bwc/enhancements/enhancements_persistable_state';

export class EmbeddablePublicPlugin implements Plugin<EmbeddableSetup, EmbeddableStart> {
  private stateTransferService: EmbeddableStateTransfer = {} as EmbeddableStateTransfer;
  private appList?: ReadonlyMap<string, PublicAppInfo>;
  private appListSubscription?: Subscription;

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { uiActions }: EmbeddableSetupDependencies) {
    registerTriggers(uiActions);

    return {
      registerReactEmbeddableFactory,
      registerAddFromLibraryType,
      registerLegacyURLTransform,
      transformEnhancementsIn: enhancementsPersistableState.extract,
      transformEnhancementsOut: enhancementsPersistableState.inject,
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

    const embeddableStart: EmbeddableStart = {
      getAddFromLibraryComponent: async () => {
        const { AddFromLibraryFlyout } = await import('./add_from_library/add_from_library_flyout');
        return AddFromLibraryFlyout;
      },
      getStateTransfer: (storage?: Storage) =>
        storage
          ? new EmbeddableStateTransfer(
              core.application.navigateToApp,
              core.application.currentAppId$,
              this.appList,
              storage
            )
          : this.stateTransferService,
      hasLegacyURLTransform,
      getLegacyURLTransform,
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
