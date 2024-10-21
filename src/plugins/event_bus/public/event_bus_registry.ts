/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Slice } from '@reduxjs/toolkit';

import { searchSlice } from './search_slice';
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
 * const search = eventBusRegistry.get(searchSlice)
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
    (eventBus as EventBus<any>).dispose();
    eventBuses.delete(name);
  }

  function get<S extends Slice>(slice: S): EventBus<S> {
    const eventBus = eventBuses.get(slice.name);
    if (eventBus === undefined) {
      throw new Error(`Event bus '${slice.name}' not found`);
    }
    return eventBus as EventBus<S>;
  }

  return {
    register,
    unregister,
    get,
  };
};

export const eventBusRegistry = createEventBusRegistry();

// Register an event bus
eventBusRegistry.register(searchSlice);

// Publishing an event
eventBusRegistry.get(searchSlice).actions.setSearchQuery('new search term');
