/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { SidebarRegistryService, type SidebarRegistryServiceApi } from './sidebar_registry_service';
import { SidebarStateService, type SidebarStateServiceApi } from './sidebar_state_service';
import {
  SidebarAppStateService,
  type SidebarAppStateServiceApi,
} from './sidebar_app_state_service';
import { SidebarServiceProvider } from '../providers';

export interface SidebarServiceSetup {
  registerApp: SidebarRegistryServiceApi['registerApp'];
}

export interface SidebarServiceStart extends SidebarStateServiceApi {
  appState: SidebarAppStateServiceApi;
}

/**
 * Composite service for sidebar functionality
 *
 * Composes:
 * - SidebarRegistryService: Manages app registration
 * - SidebarStateService: Manages UI state
 * - SidebarAppStateService: Manages app-specific state
 * - wrapInProvider method to wrap application in Sidebar context
 */
export class SidebarService {
  readonly registry: SidebarRegistryServiceApi;
  readonly state: SidebarStateServiceApi;
  readonly appState: SidebarAppStateServiceApi;

  constructor() {
    this.registry = new SidebarRegistryService();
    this.state = new SidebarStateService(this.registry);
    this.appState = new SidebarAppStateService(this.registry);
  }

  setup(): SidebarServiceSetup {
    return {
      registerApp: this.registry.registerApp.bind(this.registry),
    };
  }

  start(): SidebarServiceStart {
    // initialize state service on start to make sure all apps are registered
    (this.state as SidebarStateService).start();
    return {
      ...this.registry,
      ...this.state,
      appState: this.appState,
    };
  }

  wrapInProvider(children: React.ReactNode) {
    return <SidebarServiceProvider value={{ sidebar: this }}>{children}</SidebarServiceProvider>;
  }
}
