/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { getConfigPath } from '@kbn/utils';
import { config } from '../../../core/server';
import { ENDPOINT_VERSION } from '../common/constants';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  allowChangingOptInStatus: schema.boolean({ defaultValue: true }),
  optIn: schema.conditional(
    schema.siblingRef('allowChangingOptInStatus'),
    schema.literal(false),
    schema.maybe(schema.literal(true)),
    schema.boolean({ defaultValue: true }),
    { defaultValue: true }
  ),
  // `config` is used internally and not intended to be set
  config: schema.string({ defaultValue: getConfigPath() }),
  banner: schema.boolean({ defaultValue: true }),
  url: schema.conditional(
    schema.contextRef('dist'),
    schema.literal(false), // Point to staging if it's not a distributable release
    schema.string({
      defaultValue: `https://telemetry-staging.elastic.co/xpack/${ENDPOINT_VERSION}/send`,
    }),
    schema.string({
      defaultValue: `https://telemetry.elastic.co/xpack/${ENDPOINT_VERSION}/send`,
    })
  ),
  optInStatusUrl: schema.conditional(
    schema.contextRef('dist'),
    schema.literal(false), // Point to staging if it's not a distributable release
    schema.string({
      defaultValue: `https://telemetry-staging.elastic.co/opt_in_status/${ENDPOINT_VERSION}/send`,
    }),
    schema.string({
      defaultValue: `https://telemetry.elastic.co/opt_in_status/${ENDPOINT_VERSION}/send`,
    })
  ),
  sendUsageFrom: schema.oneOf([schema.literal('server'), schema.literal('browser')], {
    defaultValue: 'server',
  }),
  logging: schema.object({
    appenders: schema.mapOf(schema.string(), config.logging.appenders, { defaultValue: new Map() }),
    loggers: schema.arrayOf(config.logging.loggers, { defaultValue: [] }),
  }),
  // Event-based telemetry
  events: schema.object({
    // Max memory allowance assigned to each plugin's queues
    plugin_size_quota_in_bytes: schema.byteSize({ defaultValue: '1mb' }),
    // How often to retrieve the license and cluster IDs, and the opt-in status
    refresh_cluster_ids_interval: schema.duration({ defaultValue: '30m' }),
    // Sender's config
    leaky_bucket: schema.object({
      // How often do we check if we should send telemetry
      interval: schema.duration({ defaultValue: '30s' }),
      // Time to wait between successful requests
      max_frequency_of_requests: schema.duration({ defaultValue: '10s' }),
      // ... if there are more than {threshold} bytes enqueued,
      // send them at a rate of {threshold}/{max_frequency_of_requests}b/s
      threshold: schema.byteSize({ defaultValue: '10kb' }),
      // ... if there are less than {threshold} but we haven't sent anything in {max_wait_time}, send whatever is enqueued
      max_wait_time: schema.duration({ defaultValue: '1h' }),
      // On failure, re-attempt up to {max_retries}
      max_retries: schema.number({ defaultValue: 10 }),
    }),
  }),
});

export type TelemetryConfigType = TypeOf<typeof configSchema>;
