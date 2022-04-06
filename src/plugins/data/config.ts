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
   * pageSize controls how many search session objects we load at once while monitoring
   * session completion
   */
  pageSize: schema.number({ defaultValue: 100 }),
  /**
   * trackingInterval controls how often we track persisted search session objects progress
   */
  trackingInterval: schema.duration({ defaultValue: '10s' }),

  /**
   * cleanupInterval controls how often we track non-persisted search session objects for cleanup
   */
  cleanupInterval: schema.duration({ defaultValue: '60s' }),

  /**
   * expireInterval controls how often we track persisted search session objects for expiration
   */
  expireInterval: schema.duration({ defaultValue: '60m' }),

  /**
   * monitoringTaskTimeout controls for how long task manager waits for search session monitoring task to complete before considering it timed out,
   * If tasks timeouts it receives cancel signal and next task starts in "trackingInterval" time
   */
  monitoringTaskTimeout: schema.duration({ defaultValue: '5m' }),

  /**
   * notTouchedTimeout controls how long do we store unpersisted search session results,
   * after the last search in the session has completed
   */
  notTouchedTimeout: schema.duration({ defaultValue: '5m' }),
  /**
   * notTouchedInProgressTimeout controls how long do allow a search session to run after
   * a user has navigated away without persisting
   */
  notTouchedInProgressTimeout: schema.duration({ defaultValue: '1m' }),
  /**
   * maxUpdateRetries controls how many retries we perform while attempting to save a search session
   */
  maxUpdateRetries: schema.number({ defaultValue: 3 }),

  /**
   * defaultExpiration controls how long search sessions are valid for, until they are expired.
   */
  defaultExpiration: schema.duration({ defaultValue: '7d' }),
  management: schema.object({
    /**
     * maxSessions controls how many saved search sessions we display per page on the management screen.
     */
    maxSessions: schema.number({ defaultValue: 10000 }),
    /**
     * refreshInterval controls how often we refresh the management screen.
     */
    refreshInterval: schema.duration({ defaultValue: '10s' }),
    /**
     * refreshTimeout controls how often we refresh the management screen.
     */
    refreshTimeout: schema.duration({ defaultValue: '1m' }),
    expiresSoonWarning: schema.duration({ defaultValue: '1d' }),
  }),
});

export const configSchema = schema.object({
  autocomplete: schema.object({
    querySuggestions: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
    valueSuggestions: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      tiers: schema.arrayOf(
        schema.oneOf([
          schema.literal('data_content'),
          schema.literal('data_hot'),
          schema.literal('data_warm'),
          schema.literal('data_cold'),
          schema.literal('data_frozen'),
        ]),
        {
          defaultValue: ['data_hot', 'data_warm', 'data_content', 'data_cold'],
        }
      ),
      terminateAfter: schema.duration({ defaultValue: 100000 }),
      timeout: schema.duration({ defaultValue: 1000 }),
    }),
  }),
  search: schema.object({
    aggs: schema.object({
      shardDelay: schema.object({
        // Whether or not to register the shard_delay (which is only available in snapshot versions
        // of Elasticsearch) agg type/expression function to make it available in the UI for either
        // functional or manual testing
        enabled: schema.boolean({ defaultValue: false }),
      }),
    }),
    sessions: searchSessionsConfigSchema,
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;

export type SearchSessionsConfigSchema = TypeOf<typeof searchSessionsConfigSchema>;
