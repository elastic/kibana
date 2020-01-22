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
import { PluginConfigDescriptor, PluginInitializerContext } from 'kibana/server';
import { schema, TypeOf } from '@kbn/config-schema';
import { ConsoleServerPlugin } from './plugin';

export const plugin = (ctx: PluginInitializerContext) => new ConsoleServerPlugin(ctx);

export type ConfigType = TypeOf<typeof configSchema>;

const configSchema = schema.object(
  {
    enabled: schema.boolean({ defaultValue: true }),
    proxyFilter: schema.arrayOf(schema.string(), { defaultValue: ['.*'] }),
    ssl: schema.object({ verify: schema.boolean({ defaultValue: false }) }, {}),
    proxyConfig: schema.arrayOf(
      schema.object({
        match: schema.object({
          protocol: schema.string({ defaultValue: '*' }),
          host: schema.string({ defaultValue: '*' }),
          port: schema.string({ defaultValue: '*' }),
          path: schema.string({ defaultValue: '*' }),
        }),

        timeout: schema.number(),
        ssl: schema.object(
          {
            verify: schema.boolean(),
            ca: schema.arrayOf(schema.string()),
            cert: schema.string(),
            key: schema.string(),
          },
          { defaultValue: undefined }
        ),
      }),
      { defaultValue: [] }
    ),
  },
  { defaultValue: undefined }
);

export const config: PluginConfigDescriptor<ConfigType> = {
  deprecations: ({ unused }) => [unused('ssl')],
  schema: configSchema,
};
