/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of, type Observable } from 'rxjs';
import type {
  SidebarSetup,
  SidebarStart,
  SidebarApp,
  SidebarAppId,
  SidebarContext,
} from '@kbn/core-chrome-sidebar';
import { SidebarRegistryService } from './sidebar_registry_service';
import { SidebarStateService } from './sidebar_state_service';
import { StorageHelper } from './storage_helper';
import { createLiveStore } from './create_live_store';
import { bind, memoize } from './utils';

/** Composite service for sidebar: registry, UI state, and app state */
export class SidebarService {
  readonly registry: SidebarRegistryService;
  readonly state: SidebarStateService;
  private readonly storage: StorageHelper;

  constructor(params: { basePath: string }) {
    this.registry = new SidebarRegistryService();
    this.storage = new StorageHelper(`${params.basePath}:core.chrome.sidebar.app`);

    const stateStorage = new StorageHelper(`${params.basePath}:core.chrome.sidebar.state`);
    this.state = new SidebarStateService(this.registry, stateStorage);
  }

  setup(): SidebarSetup {
    return {
      registerApp: (app) => {
        const update = this.registry.registerApp(app);
        return (appUpdate) => {
          update(appUpdate);
          if (this.state.getCurrentAppId() === app.appId && !this.registry.isOpenable(app.appId)) {
            this.state.close();
          }
        };
      },
    };
  }

  start(): SidebarStart {
    this.state.start();

    return {
      isOpen$: this.state.isOpen$,
      isOpen: this.state.isOpen,
      close: this.state.close,
      getWidth$: this.state.getWidth$,
      getWidth: this.state.getWidth,
      setWidth: this.state.setWidth,
      getCurrentAppId$: this.state.getCurrentAppId$,
      getCurrentAppId: this.state.getCurrentAppId,
      hasApp: this.registry.hasApp,
      getApp: this.getApp,
      getAppDefinition: this.registry.getApp,
    };
  }

  @bind
  @memoize
  private getApp<TState = undefined, TActions = undefined>(
    appId: SidebarAppId
  ): SidebarApp<TState, TActions> {
    const def = this.registry.getApp(appId);

    const base = {
      open: () => this.state.open(appId),
      close: () => {
        if (this.state.getCurrentAppId() === appId) {
          this.state.close();
        }
      },
      getStatus: () => this.registry.getApp(appId).status,
      getStatus$: () => this.registry.getStatus$(appId),
    };

    // Stateless app - return with undefined state methods
    if (!def.store) {
      const empty$ = of(undefined as TState);
      return {
        ...base,
        actions: undefined as TActions,
        getState: () => undefined as TState,
        getState$: () => empty$,
      };
    }

    // Stateful app - create live store
    const context: SidebarContext = {
      open: () => this.state.open(appId),
      close: () => this.state.close(),
      isCurrent: () => this.state.getCurrentAppId() === appId,
    };
    const live = createLiveStore(appId, def.store, this.storage, context);

    return {
      ...base,
      actions: live.actions as TActions,
      getState: () => live.getState() as TState,
      getState$: () => live.getState$() as Observable<TState>,
    };
  }
}
