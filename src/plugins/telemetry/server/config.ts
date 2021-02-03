/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { getConfigPath } from '@kbn/utils';
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
});

export type TelemetryConfigType = TypeOf<typeof configSchema>;
