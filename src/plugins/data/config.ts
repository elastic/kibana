/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const searchSessionsConfigSchema = schema.object({
  /**
   * Turns the feature on \ off (incl. removing indicator and management screens)
   */
  enabled: schema.boolean({ defaultValue: true }),

  /**
   * notTouchedTimeout controls how long user can save a session after all searches completed.
   * The client continues to poll searches to keep the alive until this timeout hits
   */
  notTouchedTimeout: schema.duration({ defaultValue: '5m' }),

  /**
   * maxUpdateRetries controls how many retries we perform while attempting to save a search session
   */
  maxUpdateRetries: schema.number({ defaultValue: 10 }),

  /**
   * defaultExpiration controls how long search sessions are valid for, until they are expired.
   */
  defaultExpiration: schema.duration({ defaultValue: '7d' }),
  management: schema.object({
    /**
     * maxSessions controls how many saved search sessions we load on the management screen.
     */
    maxSessions: schema.number({ defaultValue: 100 }),
    /**
     * refreshInterval controls how often we refresh the management screen. 0s as duration means that auto-refresh is turned off.
     */
    refreshInterval: schema.duration({ defaultValue: '0s' }),
    /**
     * refreshTimeout controls the timeout for loading search sessions on mgmt screen
     */
    refreshTimeout: schema.duration({ defaultValue: '1m' }),
    expiresSoonWarning: schema.duration({ defaultValue: '1d' }),
  }),
});

export const searchConfigSchema = schema.object({
  /**
   * Config for search strategies that use async search based API underneath
   */
  asyncSearch: schema.object({
    /**
     *  Block and wait until the search is completed up to the timeout (see es async_search's `wait_for_completion_timeout`)
     *  TODO: we should optimize this as 100ms is likely not optimal (https://github.com/elastic/kibana/issues/143277)
     */
    waitForCompletion: schema.duration({ defaultValue: '200ms' }),
    /**
     *  How long the async search needs to be available after each search poll. Ongoing async searches and any saved search results are deleted after this period.
     *  (see es async_search's `keep_alive`)
     *  Note: This is applicable to the searches before the search session is saved.
     *  After search session is saved `keep_alive` is extended using `data.search.sessions.defaultExpiration` config
     */
    keepAlive: schema.duration({ defaultValue: '1m' }),
    /**
     * Affects how often partial results become available, which happens whenever shard results are reduced (see es async_search's `batched_reduce_size`)
     */
    batchedReduceSize: schema.number({ defaultValue: 64 }),
    /**
     * How long to wait before polling the async_search after the previous poll response.
     * If not provided, then default dynamic interval with backoff is used.
     */
    pollInterval: schema.maybe(schema.number({ min: 200 })),
  }),
  aggs: schema.object({
    shardDelay: schema.object({
      // Whether or not to register the shard_delay (which is only available in snapshot versions
      // of Elasticsearch) agg type/expression function to make it available in the UI for either
      // functional or manual testing
      enabled: schema.boolean({ defaultValue: false }),
    }),
  }),
  sessions: searchSessionsConfigSchema,
});

export const configSchema = schema.object({
  search: searchConfigSchema,
  /**
   * Turns on/off limit validations for the registered uiSettings.
   */
  enableUiSettingsValidations: schema.boolean({ defaultValue: false }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;

export type SearchConfigSchema = TypeOf<typeof searchConfigSchema>;

export type SearchSessionsConfigSchema = TypeOf<typeof searchSessionsConfigSchema>;
