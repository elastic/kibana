/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of, type Observable } from 'rxjs';
import type { HotkeyDefinition } from '@kbn/core-hotkeys-browser';

/**
 * User-supplied (or settings-driven) override for a single registered
 * hotkey. Only the fields that differ from the declared definition need
 * to be provided; omitted fields fall back to the original declaration.
 *
 * @internal
 */
export interface HotkeyOverride {
  /** New chord to bind in place of the declared `keys`. */
  keys?: HotkeyDefinition['keys'];
  /** Override for the declared `enabled` flag. */
  enabled?: boolean;
}

/**
 * Abstract source of user hotkey overrides. An implementation is
 * responsible for deriving the effective set of overrides from whichever
 * storage it owns (user settings, space settings, in-memory registry,
 * etc.) and emitting a fresh map whenever any of those change. The
 * service keyes into the map by {@link HotkeyDefinition.id}.
 *
 * Emitting a map with a given id absent is equivalent to clearing the
 * override for that hotkey.
 *
 * @internal
 */
export interface HotkeyOverridesSource {
  readonly overrides$: Observable<ReadonlyMap<string, HotkeyOverride>>;
}

const EMPTY_OVERRIDES: ReadonlyMap<string, HotkeyOverride> = new Map();

/**
 * Default source used when no override provider is configured. Emits a
 * single empty map and completes, so the service treats every
 * registration as using its declared binding.
 *
 * @internal
 */
export const createEmptyOverridesSource = (): HotkeyOverridesSource => ({
  overrides$: of(EMPTY_OVERRIDES),
});
