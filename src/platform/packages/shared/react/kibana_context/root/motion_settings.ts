/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useSyncExternalStore } from 'react';

export type MotionRefreshId = 'tooltip' | 'tabs' | 'accordion' | 'callout' | 'page';

export interface MotionRefreshSettings {
  tooltip: boolean;
  tabs: boolean;
  accordion: boolean;
  callout: boolean;
  page: boolean;
}

const DEFAULT_SETTINGS: MotionRefreshSettings = {
  tooltip: true,
  tabs: true,
  accordion: true,
  callout: true,
  page: true,
};

let settings: MotionRefreshSettings = { ...DEFAULT_SETTINGS };
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => listener());
};

/** Reads the current motion refresh switches. Every motion starts enabled. */
export const getMotionRefreshSettings = (): MotionRefreshSettings => settings;

/** Subscribes to motion refresh switch changes. */
export const subscribeMotionRefreshSettings = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Turns one motion update on or off. */
export const setMotionRefreshItem = (id: MotionRefreshId, enabled: boolean): void => {
  if (settings[id] === enabled) return;
  settings = { ...settings, [id]: enabled };
  emit();
};

/** Turns every motion update on or off together. */
export const setMotionRefreshEnabled = (enabled: boolean): void => {
  if (
    settings.tooltip === enabled &&
    settings.tabs === enabled &&
    settings.accordion === enabled &&
    settings.callout === enabled &&
    settings.page === enabled
  ) {
    return;
  }
  settings = {
    tooltip: enabled,
    tabs: enabled,
    accordion: enabled,
    callout: enabled,
    page: enabled,
  };
  emit();
};

/** Subscribes a component to the motion refresh switches. */
export const useMotionRefreshSettings = (): MotionRefreshSettings =>
  useSyncExternalStore(
    subscribeMotionRefreshSettings,
    getMotionRefreshSettings,
    getMotionRefreshSettings
  );
