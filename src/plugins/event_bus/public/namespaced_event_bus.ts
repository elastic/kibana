/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect } from 'react';
import { Slice, CaseReducerActions } from '@reduxjs/toolkit';

import { searchSlice } from './search_slice';
import { EventBus } from './event_bus';

export class NamespacedEventBus {
  private buses: {
    [namespace: string]: EventBus<string, any, any>;
  } = {};

  // Register a namespaced event bus with reducer and initial state
  registerNamespace(namespace: string, slice: Slice) {
    if (!this.buses[namespace]) {
      this.buses[namespace] = new EventBus(slice);
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

  // Get a namespaced event bus
  getEventBus<Namespace extends string, State, Actions extends CaseReducerActions<any, Namespace>>(
    namespace: Namespace
  ): EventBus<Namespace, State, Actions> {
    if (!this.buses[namespace]) {
      throw new Error(`Namespace ${namespace} is not registered.`);
    }

    return this.buses[namespace];
  }

  // React hook
  useEventBusValue(namespace: string) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [eventBusValue, setEventBusValue] = useState<any>(null);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const subscription = this.getEventBus(namespace).subscribe(setEventBusValue);

      return () => {
        subscription.unsubscribe();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return eventBusValue;
  }
}

export const nameSpacedEventBus = new NamespacedEventBus();

// Register a namespace
nameSpacedEventBus.registerNamespace('search', searchSlice);

// Publishing an event
nameSpacedEventBus.getEventBus('search').actions.setSearchQuery('new search term');
