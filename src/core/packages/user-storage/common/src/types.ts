/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ZodType } from '@kbn/zod/v4';

/** Whether a key is scoped to a single space or is global across all spaces. */
export type UserStorageScope = 'space' | 'global';

/** Definition for a single user storage key, provided at registration time. */
export interface UserStorageDefinition<T = unknown> {
  /** zod/v4 schema used to validate values on write. */
  schema: ZodType<T>;
  /** Value returned when the user has not set this key. */
  defaultValue: T;
  /** Whether this key is per-space or global. */
  scope: UserStorageScope;
  /**
   * When `true`, the effective value for this key is resolved server-side at
   * first-paint time and embedded in the page HTML so the browser cache is
   * pre-populated before any JavaScript runs.
   *
   * Keys without `preload: true` are loaded lazily: the browser cache
   * starts empty for that key and the first `get(key)` / `get$(key)` call
   * triggers a per-key HTTP fetch to hydrate the cache.
   *
   * Prefer `preload: true` only for keys whose values are needed on the
   * critical rendering path. Large or rarely-read payloads should remain lazy
   * to avoid bloating the initial HTML payload.
   */
  preload?: boolean;
}

/** A record of key → definition, passed to `register()`. */
export type UserStorageRegistrations = Record<string, UserStorageDefinition>;

/** Server-side scoped client returned by `asScopedToClient()`. */
export interface IUserStorageClient {
  /** Resolve a single key: returns the user override or the registered default. */
  get<T = unknown>(key: string): Promise<T>;
  /**
   * Resolve all keys whose definition has `preload: true`, merging user
   * overrides with registered defaults. Used exclusively by the rendering
   * service to embed values in the initial HTML payload.
   */
  getForInjection(): Promise<Record<string, unknown>>;
  /**
   * Validate and persist a value for the current user. Returns the
   * schema-validated form of the value as stored (after any Zod transforms
   * or stripping), so callers can use the canonical representation.
   */
  set<T = unknown>(key: string, value: T): Promise<T>;
  /** Remove the user override so the key falls back to its default. */
  remove(key: string): Promise<void>;
}
