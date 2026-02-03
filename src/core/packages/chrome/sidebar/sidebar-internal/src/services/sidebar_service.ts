/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SidebarSetup,
  SidebarStart,
  SidebarApp,
  SidebarAppId,
} from '@kbn/core-chrome-sidebar';
import { SidebarRegistryService } from './sidebar_registry_service';
import { SidebarStateService } from './sidebar_state_service';
import { SidebarAppStateService } from './sidebar_app_state_service';
import { StorageHelper } from './storage_helper';
import { bind, memoize } from './utils';

/** Composite service for sidebar: registry, UI state, and app params */
export class SidebarService {
  readonly registry: SidebarRegistryService;
  readonly appState: SidebarAppStateService;
  readonly state: SidebarStateService;

  constructor(params: { basePath: string }) {
    this.registry = new SidebarRegistryService();

    const appStateStorage = new StorageHelper(`${params.basePath}:core.chrome.sidebar.app`);
    this.appState = new SidebarAppStateService(this.registry, appStateStorage);

    const stateStorage = new StorageHelper(`${params.basePath}:core.chrome.sidebar.state`);
    this.state = new SidebarStateService(this.registry, this.appState, stateStorage);
  }

  setup(): SidebarSetup {
    return {
      registerApp: this.registry.registerApp,
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
  private getApp<TParams = unknown>(appId: SidebarAppId): SidebarApp<TParams> {
    return {
      open: (params?: Partial<TParams>) => this.state.open(appId, params),
      close: () => {
        if (this.state.getCurrentAppId() === appId) {
          this.state.close();
        }
      },
      setParams: (params: Partial<TParams>) => this.appState.setParams(appId, params),
      getParams: () => this.appState.getParams(appId),
      getParams$: () => this.appState.getParams$(appId),
    };
  }
}
