/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useSyncExternalStore } from 'react';
import type { QueryProfileHeat } from './query_heat_model';

/**
 * The heat of the query most recently profiled, kept for the page session so the profile view and
 * a query editor in another part of the page can share it.
 */
let current: QueryProfileHeat | undefined;
const listeners = new Set<() => void>();

export const getQueryProfileHeat = (): QueryProfileHeat | undefined => current;

export const setQueryProfileHeat = (next: QueryProfileHeat | undefined): void => {
  current = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Re-renders when the shared heat changes. */
export const useQueryProfileHeat = (): QueryProfileHeat | undefined =>
  useSyncExternalStore(subscribe, getQueryProfileHeat);
