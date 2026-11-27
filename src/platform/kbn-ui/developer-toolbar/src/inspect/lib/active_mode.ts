/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useSyncExternalStore } from 'react';
import type { InspectMode } from './types';

/**
 * The mode that is currently active, shared by every button and shortcut so that only one
 * overlay can be on at a time.
 */
let activeMode: InspectMode | null = null;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getActiveMode = (): InspectMode | null => activeMode;

/** Makes the mode the active one, replacing any other, or turns every mode off with `null`. */
export const setActiveMode = (mode: InspectMode | null): void => {
  if (activeMode === mode) return;

  activeMode = mode;
  listeners.forEach((listener) => listener());
};

/** Turns the mode off when it is active, otherwise makes it the active mode, replacing any other. */
export const toggleActiveMode = (mode: InspectMode): void => {
  setActiveMode(activeMode === mode ? null : mode);
};

/** Turns the mode off, unless another mode has taken over in the meantime. */
export const deactivateMode = (mode: InspectMode): void => {
  if (activeMode === mode) {
    setActiveMode(null);
  }
};

export const useActiveMode = (): InspectMode | null =>
  useSyncExternalStore(subscribe, getActiveMode, getActiveMode);
