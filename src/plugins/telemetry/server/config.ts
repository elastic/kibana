/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { getConfigPath } from '../../../core/server/path';
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
