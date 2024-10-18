/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect } from 'react';
import { distinctUntilChanged, scan, BehaviorSubject } from 'rxjs';
import { isEqual } from 'lodash';

import { setSearchQuery, searchSlice } from './search_slice';

export interface EventBus {
  subject: BehaviorSubject<any>;
  reducer: any;
  initialState: any;
}

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
  private buses: {
    [namespace: string]: EventBus;
  } = {};

  // Register a namespaced event bus with reducer and initial state
  registerNamespace(namespace: string, reducer: any, initialState: any) {
    if (!this.buses[namespace]) {
      this.buses[namespace] = {
        subject: new BehaviorSubject<Action>(initialAction),
        reducer,
        initialState,
      };
    } else {
      // eslint-disable-next-line no-console
      console.warn(`Namespace ${namespace} is already registered.`);
    }
  }

  // Unregister a namespaced event bus
  unregisterNamespace(namespace: string) {
    if (this.buses[namespace]) {
      this.buses[namespace].subject.complete();
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
      bus.subject.next(action);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`Namespace ${namespace} is not registered. Cannot dispatch action.`);
    }
  }

  // Subscribe to a specific namespaced bus
  subscribe(namespace: string, cb: any) {
    const bus = this.buses[namespace];
    if (!bus) {
      // eslint-disable-next-line no-console
      console.warn(`Namespace ${namespace} is not registered. Cannot subscribe.`);
      return { unsubscribe: () => {} }; // Return a no-op unsubscribe function
    }

    return bus.subject
      .pipe(scan(bus.reducer, bus.initialState), distinctUntilChanged(isEqual))
      .subscribe(cb);
  }

  // React hook
  useEventBus(namespace: string) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [eventBusValue, setEventBusValue] = useState<any>(null);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const subscription = this.subscribe(namespace, setEventBusValue);

      return () => {
        subscription.unsubscribe();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return eventBusValue;
  }
}

export const eventBus = new NamespacedEventBus();

// Register a namespace
eventBus.registerNamespace('search', searchSlice.reducer, searchSlice.getInitialState());

// Publishing an event
eventBus.dispatch('search', setSearchQuery('new search term'));
