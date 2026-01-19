/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SidebarSetup, SidebarStart } from '@kbn/core-chrome-sidebar-types';
import { SidebarRegistryService } from './sidebar_registry_service';
import { SidebarStateService } from './sidebar_state_service';
import { SidebarAppStateService } from './sidebar_app_state_service';

export type { SidebarSetup, SidebarStart } from '@kbn/core-chrome-sidebar-types';

/**
 * Composite service for sidebar functionality
 *
 * Composes:
 * - SidebarRegistryService: Manages app registration
 * - SidebarStateService: Manages UI state (open/close, width)
 * - SidebarAppStateService: Manages params passed to sidebar app components
 */
export class SidebarService {
  readonly registry: SidebarRegistryService;
  readonly appState: SidebarAppStateService;
  readonly state: SidebarStateService;

  constructor() {
    this.registry = new SidebarRegistryService();
    this.appState = new SidebarAppStateService(this.registry);
    this.state = new SidebarStateService(this.registry, this.appState);
  }

  setup(): SidebarSetup {
    return {
      registerApp: this.registry.registerApp.bind(this.registry),
    };
  }

  start(basePath: string): SidebarStart {
    // initialize services on start to make sure all apps are registered
    this.appState.start(basePath);
    (this.state as SidebarStateService).start(basePath);
    return {
      // SidebarStateServiceApi
      isOpen$: this.state.isOpen$.bind(this.state),
      isOpen: this.state.isOpen.bind(this.state),
      open: this.state.open.bind(this.state),
      close: this.state.close.bind(this.state),
      getWidth$: this.state.getWidth$.bind(this.state),
      getWidth: this.state.getWidth.bind(this.state),
      setWidth: this.state.setWidth.bind(this.state),
      getCurrentAppId$: this.state.getCurrentAppId$.bind(this.state),
      getCurrentAppId: this.state.getCurrentAppId.bind(this.state),
      // SidebarAppStateServiceApi
      getParams$: this.appState.getParams$.bind(this.appState),
      getParams: this.appState.getParams.bind(this.appState),
      setParams: this.appState.setParams.bind(this.appState),
      // SidebarRegistryServiceApi
      setAvailable: this.registry.setAvailable.bind(this.registry),
      getAvailableApps$: this.registry.getAvailableApps$.bind(this.registry),
      hasApp: this.registry.hasApp.bind(this.registry),
      getApp: this.registry.getApp.bind(this.registry),
    };
  }
}
