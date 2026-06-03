/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Per-entity-type enablement store for the entity-centric lab.
 *
 * The "Manage entity types" wizard exposes a switch per row that turns the
 * flyout trigger on or off for that type. When OFF, both the Discover logs
 * panel and the Streams entities views suppress the click that would
 * normally open the entity flyout — the entity name is rendered as plain
 * subdued text instead of a link.
 *
 * Why a separate store from {@link flyout_template_overrides}:
 *   - Template overrides care about *what* the flyout renders (tabs,
 *     custom links). This store cares about *whether* the flyout opens
 *     at all. Different scope, different lifecycle.
 *   - Keying by the same opaque string (entity-type id, e.g. `apm-service`)
 *     keeps the wizard's table semantics intact: one row, one switch.
 *
 * Default state for any unknown id is "enabled" — out of the box every
 * type behaves as before. Disabling is opt-in via the wizard, persisted
 * across reloads to `localStorage` so the demo state feels real.
 *
 * NB this is lab-only state — no migration story, no schema versioning
 * beyond the v1 storage key. Bumping the key cleanly invalidates legacy
 * payloads if/when the shape changes.
 */

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'entityCentricLab.entityTypeEnablement.v1';

type Listener = () => void;

interface SharedState {
  /**
   * Only the *disabled* ids are kept so the snapshot stays small
   * (default is "enabled" for everything) and so a fresh entity-type id
   * auto-enables itself without any explicit migration when the type
   * catalogue grows.
   */
  readonly disabledIds: Set<string>;
  readonly listeners: Set<Listener>;
  hydrated: boolean;
}

/**
 * Anchor the store on `globalThis` so every loaded copy of this module
 * — Discover's bundle, the Streams app's bundle, anything that imports
 * `@kbn/entity-centric-lab-flyout` — shares the same `Set` of disabled
 * ids and the same listener registry.
 *
 * Without this, plugins that get bundled into separate chunks each end
 * up with their own in-memory state. Writing from one plugin would
 * still persist to `localStorage`, but the `notify()` call would only
 * re-render subscribers in the same bundle. The visible symptom was
 * "toggle OFF in Streams greys out the link in Discover (because the
 * Discover bundle re-hydrates on next navigation), but toggle ON
 * doesn't re-enable it (the in-memory cache is already populated and
 * never refreshed)".
 *
 * The key is namespaced + versioned so it can be cleanly invalidated
 * if the shape ever changes.
 */
const GLOBAL_STATE_KEY = '__kbnEntityCentricLab_entityTypeEnablement_v1__' as const;

const getSharedState = (): SharedState => {
  const root = globalThis as unknown as Record<string, SharedState | undefined>;
  let state = root[GLOBAL_STATE_KEY];
  if (!state) {
    state = {
      disabledIds: new Set<string>(),
      listeners: new Set<Listener>(),
      hydrated: false,
    };
    root[GLOBAL_STATE_KEY] = state;
  }
  return state;
};

const readStorage = (): readonly string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    // Corrupt payload from a previous session — drop it silently rather
    // than throw inside a React render.
    return [];
  }
};

const writeStorage = (snapshot: readonly string[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Out of quota or storage blocked — the in-memory copy is still good
    // for the rest of the session.
  }
};

const hydrateOnce = (): void => {
  const state = getSharedState();
  if (state.hydrated) return;
  state.hydrated = true;
  for (const id of readStorage()) {
    state.disabledIds.add(id);
  }
};

const notify = (): void => {
  // Snapshot the listener set before iterating so a listener that
  // unsubscribes during notification doesn't mutate the set we're
  // currently walking.
  for (const listener of [...getSharedState().listeners]) listener();
};

/**
 * Synchronous lookup. Returns `true` for any id that has not been
 * explicitly disabled, including `undefined` — callers that can't resolve
 * an entity type id (e.g. an entity name that doesn't map to a known
 * kind) get the "enabled" default and the trigger keeps working.
 */
export const isEntityTypeEnabled = (entityTypeId: string | undefined): boolean => {
  hydrateOnce();
  if (!entityTypeId) return true;
  return !getSharedState().disabledIds.has(entityTypeId);
};

/**
 * Flip an entity type's enablement and persist it. No-op if the new
 * value already matches the current one — saves a write + notify cycle
 * for redundant toggles.
 */
export const setEntityTypeEnabled = (entityTypeId: string, enabled: boolean): void => {
  hydrateOnce();
  const { disabledIds } = getSharedState();
  const wasDisabled = disabledIds.has(entityTypeId);
  if (wasDisabled === !enabled) return;
  if (enabled) {
    disabledIds.delete(entityTypeId);
  } else {
    disabledIds.add(entityTypeId);
  }
  writeStorage([...disabledIds]);
  notify();
};

/**
 * Subscribe to enablement changes. Returns an unsubscribe function.
 * Used internally by {@link useEntityTypeEnabled}; exported for tests
 * and for any future non-React consumer.
 */
export const subscribeEntityTypeEnablement = (listener: Listener): (() => void) => {
  const { listeners } = getSharedState();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * React hook variant of {@link isEntityTypeEnabled}. Re-renders the
 * caller whenever any entity type's enablement changes — the per-id
 * filter happens inside the snapshot getter, which keeps the
 * subscription itself cheap (one global set of listeners regardless of
 * how many components consult the store).
 */
export const useEntityTypeEnabled = (entityTypeId: string | undefined): boolean =>
  useSyncExternalStore(
    subscribeEntityTypeEnablement,
    () => isEntityTypeEnabled(entityTypeId),
    // SSR snapshot: assume enabled — the lab is a pure browser feature
    // anyway, and this keeps Node renders deterministic.
    () => true
  );
