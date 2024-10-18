/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { distinctUntilChanged, scan, BehaviorSubject } from 'rxjs';
import { isEqual } from 'lodash';

import { setSearchQuery } from './search_slice';

export interface Action {
  type: string;
  payload: any;
}

const initialAction: Action = {
  type: 'init',
  payload: null,
};

/**
 * Namespaced Event Bus
 */
export class NamespacedEventBus {
  private buses: { [namespace: string]: BehaviorSubject<any> } = {};

  // Create or get an existing namespaced bus
  getOrCreateBus(namespace: string) {
    if (!this.buses[namespace]) {
      this.buses[namespace] = new BehaviorSubject<Action>(initialAction);
    }
    return this.buses[namespace];
  }

  // Register a namespaced event bus
  registerNamespace(namespace: string) {
    if (!this.buses[namespace]) {
      this.buses[namespace] = new BehaviorSubject<Action>(initialAction);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`Namespace ${namespace} is already registered.`);
    }
  }

  // Unregister a namespaced event bus
  unregisterNamespace(namespace: string) {
    if (this.buses[namespace]) {
      this.buses[namespace].complete();
      delete this.buses[namespace];
    } else {
      // eslint-disable-next-line no-console
      console.warn(`Namespace ${namespace} is not registered.`);
    }
  }

  // Dispatch an action to a specific namespaced bus
  dispatch(namespace: string, action: Action) {
    const bus = this.buses[namespace];
    if (bus) {
      bus.next(action);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`Namespace ${namespace} is not registered. Cannot dispatch action.`);
    }
  }

  // Subscribe to a specific namespaced bus
  subscribe(namespace: string, reducer: any, initialState: any, cb: any) {
    const bus = this.buses[namespace];
    if (!bus) {
      // eslint-disable-next-line no-console
      console.warn(`Namespace ${namespace} is not registered. Cannot subscribe.`);
      return { unsubscribe: () => {} }; // Return a no-op unsubscribe function
    }

    return bus.pipe(scan(reducer, initialState), distinctUntilChanged(isEqual)).subscribe(cb);
  }
}

export const eventBus = new NamespacedEventBus();

// Plugins or components can subscribe to events
export type Subscribe = typeof eventBus.subscribe;

// Register a namespace
eventBus.registerNamespace('search');

// Publishing an event
eventBus.dispatch('search', setSearchQuery('new search term'));
