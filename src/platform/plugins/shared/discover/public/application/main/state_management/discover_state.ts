/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { DiscoverSearchSessionManager } from './discover_search_session';
import type { DiscoverCustomizationContext } from '../../../customizations';
import type { InternalStateStore, RuntimeStateManager, TabActionInjector, TabState } from './redux';

export interface DiscoverStateContainer {
  /**
   * Internal shared state that's used at several places in the UI
   */
  internalState: InternalStateStore;
  /**
   * Injects the current tab into a given internalState action
   */
  injectCurrentTab: TabActionInjector;
  /**
   * Gets the state of the current tab
   */
  getCurrentTab: () => TabState;
  /**
   * State manager for runtime state that can't be stored in Redux
   */
  runtimeStateManager: RuntimeStateManager;
  /**
   * State of url, allows updating and subscribing to url changes
   */
  stateStorage: IKbnUrlStateStorage;
  /**
   * Service for handling search sessions
   */
  searchSessionManager: DiscoverSearchSessionManager;
  /**
   * Context object for customization related properties
   */
  customizationContext: DiscoverCustomizationContext;
}
