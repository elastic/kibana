/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Global "chaos mode" toggle for the entity-centric lab.
 *
 * The lab ships a curated incident storyline (PayFlow — see
 * {@link STORY_CLICKABLE_NAMES} in `./payflow_story`). When chaos
 * mode is ON (the default), the four click-path entities render
 * their incident overviews + tabs and the entity list shows them
 * as `unhealthy` / `atRisk`.
 *
 * When the user clicks "Roll back to previous version" from a
 * service flyout we flip chaos mode OFF and:
 *   - {@link getStoryOverview} / {@link getStoryTabsData} short-circuit
 *     to `undefined` so the flyout falls back to the regular kind
 *     template;
 *   - {@link getEffectiveEntityHealth} overrides the storyline
 *     entities' health to `'healthy'` everywhere it's read (entity
 *     list, grouped grid tile colour biasing, flyout overview
 *     dispatch) so the recovery is visible across surfaces.
 *
 * A switch in the Discover logs panel header lets the user re-arm
 * chaos to replay the incident.
 *
 * State is anchored on `globalThis` (so Discover's bundle and the
 * Streams app's bundle share the same boolean) and persisted to
 * `localStorage` (so a reload keeps the rollback state in place).
 * Default is ON — the demo starts with the incident in motion.
 */

import { useSyncExternalStore } from 'react';
import { PAYFLOW_AFFECTED_NAMES } from './payflow_story';
import type { EntityHealthVariant } from './kind_templates';

const STORAGE_KEY = 'entityCentricLab.chaosMode.v1';

type Listener = () => void;

interface SharedState {
  /**
   * Only `false` is meaningful — chaos defaults to ON so an unset
   * state and a missing `localStorage` entry both read as `true`.
   */
  enabled: boolean;
  readonly listeners: Set<Listener>;
  hydrated: boolean;
}

/**
 * Anchor the store on `globalThis` so every loaded copy of this
 * module — Discover's bundle, the Streams app's bundle, anything
 * that imports `@kbn/entity-centric-lab-flyout` — shares the same
 * boolean and the same listener registry. Same reasoning as
 * `entity_type_enablement.ts`: without this, the Discover toggle
 * would persist to `localStorage` but the Streams flyout's
 * in-memory copy would stay stale until the next reload.
 */
const GLOBAL_STATE_KEY = '__kbnEntityCentricLab_chaosMode_v1__' as const;

const getSharedState = (): SharedState => {
  const root = globalThis as unknown as Record<string, SharedState | undefined>;
  let state = root[GLOBAL_STATE_KEY];
  if (!state) {
    state = {
      enabled: true,
      listeners: new Set<Listener>(),
      hydrated: false,
    };
    root[GLOBAL_STATE_KEY] = state;
  }
  return state;
};

const readStorage = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true;
    const parsed: unknown = JSON.parse(raw);
    return parsed !== false;
  } catch {
    // Corrupt payload from a previous session — fall back to the
    // default (chaos on) rather than throw inside a React render.
    return true;
  }
};

const writeStorage = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled));
  } catch {
    // Out of quota or storage blocked — the in-memory copy is still
    // good for the rest of the session.
  }
};

const hydrateOnce = (): void => {
  const state = getSharedState();
  if (state.hydrated) return;
  state.hydrated = true;
  state.enabled = readStorage();
};

const notify = (): void => {
  // Snapshot listeners before iterating so a listener that
  // unsubscribes during notification doesn't mutate the set we're
  // walking.
  for (const listener of [...getSharedState().listeners]) listener();
};

/**
 * Synchronous getter. Returns `true` by default — the lab starts
 * with the PayFlow incident in motion.
 */
export const getChaosModeEnabled = (): boolean => {
  hydrateOnce();
  return getSharedState().enabled;
};

/**
 * Flip chaos mode and persist it. No-op when the value already
 * matches — saves a write + notify cycle for redundant toggles.
 */
export const setChaosModeEnabled = (enabled: boolean): void => {
  hydrateOnce();
  const state = getSharedState();
  if (state.enabled === enabled) return;
  state.enabled = enabled;
  writeStorage(enabled);
  notify();
};

/**
 * Subscribe to chaos-mode changes. Returns an unsubscribe function.
 * Used internally by {@link useChaosModeEnabled}; exported for any
 * future non-React consumer.
 */
export const subscribeChaosMode = (listener: Listener): (() => void) => {
  const { listeners } = getSharedState();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * React hook variant of {@link getChaosModeEnabled}. Re-renders the
 * caller whenever the toggle flips.
 */
export const useChaosModeEnabled = (): boolean =>
  useSyncExternalStore(
    subscribeChaosMode,
    getChaosModeEnabled,
    // SSR snapshot: assume chaos on so server renders match the
    // default browser state.
    () => true
  );

/**
 * Returns the "effective" health for an entity given the supplied
 * chaos-mode flag. Every entity in {@link PAYFLOW_AFFECTED_NAMES} —
 * the four click-path flyouts *plus* the supporting cast directly
 * impacted by the v2.14.3 deploy (PayFlow namespaces, the EU
 * cluster + region, the batch job sharing the failing node) — is
 * forced to `'healthy'` when chaos is OFF. Background unhealthy
 * entities outside that set (random EC2 / Lambda / S3 issues
 * elsewhere) keep their dataset-defined health verbatim so the
 * rollback heals PayFlow without magically fixing unrelated
 * problems.
 *
 * The chaos-mode flag is passed in explicitly (rather than read
 * from the global store inside the helper) so React call sites can
 * couple the helper's result to `useChaosModeEnabled()` via a
 * single dep without tripping `react-hooks/exhaustive-deps`. Pure
 * call sites (the flyout builders) read the global state via
 * {@link getChaosModeEnabled} and forward it in.
 */
export const getEffectiveEntityHealth = <T extends EntityHealthVariant>(
  entityName: string,
  health: T,
  chaosOn: boolean
): T => {
  if (chaosOn) return health;
  if (!PAYFLOW_AFFECTED_NAMES.has(entityName)) return health;
  return 'healthy' as T;
};
