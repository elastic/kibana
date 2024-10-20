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

/**
 * When building a registry in TypeScript where services are dynamically
 * registered and not known upfront, maintaining type safety becomes
 * challenging due to TypeScript's static type system.
 *
 * This registry uses generics for service access. It means you need to provide
 * the type of the slice of the event bus you want to get for proper type safety.
 *
 * Example:
 * const search = eventBusRegistry.get<SearchSlice>('search')
 *
 * Similar to Kibana's plugin depedency management, a different approach would
 * be to define the possible services up front, but that's not possible here
 * because the use case of this event bus registry is also to allow registering
 * event buses dynamically, for example for a user generated dashboard.
 *
 * @returns The event bus registry
 */
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

  // React hook with an optional selector
  // without needing to provide the generic type.
  function useEventBusValue<S extends Slice>(name: S['name']): ReturnType<S['reducer']>;
  function useEventBusValue<S extends Slice, SelectedState>(
    name: S['name'],
    selector: (state: ReturnType<S['reducer']>) => SelectedState
  ): SelectedState;
  function useEventBusValue<S extends Slice, SelectedState = ReturnType<S['reducer']>>(
    name: S['name'],
    selector?: (state: ReturnType<S['reducer']>) => SelectedState
  ): SelectedState {
    const initialValue = selector
      ? selector(get<S>(name).slice.getInitialState())
      : get<S>(name).slice.getInitialState();
    const [eventBusValue, setEventBusValue] = useState<SelectedState>(initialValue);

    useEffect(() => {
      const subscription = get<S>(name).subscribe(
        setEventBusValue,
        // Workaround to satisfy correct types to be returned
        selector ?? ((state) => state as SelectedState)
      );

      return () => {
        subscription.unsubscribe();
      };
    }, [name, selector]);

    return eventBusValue;
  }

  return {
    register,
    unregister,
    get,
    useEventBusValue,
  };
};

export const eventBusRegistry = createEventBusRegistry();

// Register an event bus
eventBusRegistry.register(searchSlice);

// Publishing an event
eventBusRegistry.get<SearchSlice>('search').actions.setSearchQuery('new search term');
