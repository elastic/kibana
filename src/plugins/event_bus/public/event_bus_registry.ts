/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect } from 'react';
import { Slice } from '@reduxjs/toolkit';

import { searchSlice, type SearchSlice } from './search_slice';
import { EventBus } from './event_bus';

const createEventBusRegistry = () => {
  const eventBuses: Map<string, unknown> = new Map();

  function register<S extends Slice>(slice: S): void {
    // first check if the event bus is already registered
    if (eventBuses.has(slice.name)) {
      throw new Error(`Event bus '${slice.name}' is already registered`);
    }

    eventBuses.set(slice.name, new EventBus(slice));
  }

  function unregister(name: string): void {
    const eventBus = eventBuses.get(name);
    if (eventBus === undefined) {
      throw new Error(`Event bus '${name}' not found`);
    }
    (eventBus as EventBus<any>).subject.complete();
    eventBuses.delete(name);
  }

  function get<T extends Slice>(name: string): EventBus<T> {
    const eventBus = eventBuses.get(name);
    if (eventBus === undefined) {
      throw new Error(`Event bus '${name}' not found`);
    }
    return eventBus as EventBus<T>;
  }

  return {
    register,
    unregister,
    get,

    // React hook
    useEventBusValue<T extends Slice>(name: T['name']) {
      const [eventBusValue, setEventBusValue] = useState<any>(null);

      useEffect(() => {
        const subscription = get<T>(name).subscribe(setEventBusValue);

        return () => {
          subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      return eventBusValue;
    },
  };
};

export const eventBusRegistry = createEventBusRegistry();

// Register an event bus
eventBusRegistry.register(searchSlice);

// Publishing an event
eventBusRegistry.get<SearchSlice>('search').actions.setSearchQuery('new search term');
