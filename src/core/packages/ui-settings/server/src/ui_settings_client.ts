/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type {
  UserProvidedValues,
  UiSettingsParams,
  GetUiSettingsContext,
} from '@kbn/core-ui-settings-common';

interface ValueValidation {
  valid: boolean;
  errorMessage?: string;
}

/**
 * Server-side client that provides access to the advanced settings stored in elasticsearch.
 * The settings provide control over the behavior of the Kibana application.
 * For example, a user can specify how to display numeric or date fields.
 * Users can adjust the settings via Management UI.
 *
 * @public
 */
export interface IUiSettingsClient {
  /**
   * Returns registered uiSettings values {@link UiSettingsParams}
   */
  getRegistered: () => Readonly<Record<string, Omit<UiSettingsParams, 'schema'>>>;
  /**
   * Retrieves uiSettings values set by the user with fallbacks to default values if not specified.
   */
  get: <T = any>(key: string, context?: GetUiSettingsContext) => Promise<T>;
  /**
   * Observes the value of `key` in this client's scope (the space of the saved objects client for `asScopedToClient`,
   * the whole deployment for `globalAsScopedToClient`), including changes made on other Kibana nodes.
   *
   * - Emits the value `get(key)` without a context would return, first after the first successful read, then once
   *   per change. Never emits synchronously, and two consecutive values are never deep-equal.
   * - Changes written through this Kibana node are emitted before the write resolves. Changes written on other
   *   nodes are emitted within one poll interval (10 seconds).
   * - Never errors. While Elasticsearch is unreachable, the last value is kept.
   * - Completes when Kibana stops. A key overridden in `kibana.yml` emits once and completes.
   * - Throws for a key registered with `getValue`, because its default depends on the request.
   *
   * The saved objects client the scoped client was created with only selects the space. Reads use Kibana's internal
   * identity, so the subscription can outlive the request that created the client.
   *
   * @example
   * ```ts
   * core.uiSettings
   *   .globalAsScopedToClient(core.savedObjects.createInternalRepository())
   *   .get$<boolean>('myPlugin:enabled')
   *   .subscribe((enabled) => (enabled ? start() : stop()));
   * ```
   */
  get$: <T = any>(key: string) => Observable<T>;
  /**
   * Retrieves a set of all uiSettings values set by the user with fallbacks to default values if not specified.
   */
  getAll: <T = any>(context?: GetUiSettingsContext) => Promise<Record<string, T>>;
  /**
   * Retrieves a set of all uiSettings values set by the user.
   *
   * bypassCache - if true, forces retrieval of user-provided values from the source (e.g. elasticsearch) instead of cache. This is useful in scenarios where we know the cache may be stale and want to ensure we have the latest values, such as during a full page reload. In typical usage, this would be false to take advantage of caching for performance.
   *
   * Note: When bypassCache is true, the cache will be eventually be freshened with new values, but other concurrent requests will keep using the existing entry if it exists. This allows for a faster fallback in cases where the cache is stale but still available. This behavior differs from what occurs during a usual cache miss, where the first request would trigger a fetch and populate the cache, while subsequent requests would wait for that fetch to complete and then use the updated cache.
   */
  getUserProvided: <T = any>(
    bypassCache?: boolean
  ) => Promise<Record<string, UserProvidedValues<T>>>;
  /**
   * Writes multiple uiSettings values and marks them as set by the user.
   */
  setMany: (changes: Record<string, any>) => Promise<void>;
  /**
   * Writes uiSettings value and marks it as set by the user.
   */
  set: (key: string, value: any) => Promise<void>;
  /**
   * Removes uiSettings value by key.
   */
  remove: (key: string) => Promise<void>;
  /**
   * Removes multiple uiSettings values by keys.
   */
  removeMany: (
    keys: string[],
    options?: { validateKeys?: boolean; handleWriteErrors?: boolean }
  ) => Promise<void>;
  /**
   * Shows whether the uiSettings value set by the user.
   */
  isOverridden: (key: string) => boolean;
  /**
   * Shows whether the uiSetting is a sensitive value. Used by telemetry to not send sensitive values.
   */
  isSensitive: (key: string) => boolean;
  /**
   * Validates the uiSettings value and returns a ValueValidation object.
   */
  validate: (key: string, value: unknown) => Promise<ValueValidation>;
}
