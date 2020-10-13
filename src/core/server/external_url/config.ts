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

import { TypeOf, schema } from '@kbn/config-schema';
import { IExternalUrlPolicy } from '.';

/**
 * @internal
 */
export type ExternalUrlConfigType = TypeOf<typeof config.schema>;

const allowSchema = schema.boolean();

const hostSchema = schema.string();

const protocolSchema = schema.string({
  validate: (value) => {
    if (value.indexOf('/') >= 0) {
      throw new Error(`protocols should not include slashes`);
    }
  },
});

const policySchema = schema.oneOf([
  schema.object({
    allow: allowSchema,
    host: hostSchema,
  }),
  schema.object({
    allow: allowSchema,
    protocol: protocolSchema,
  }),
  schema.object({
    allow: allowSchema,
    protocol: protocolSchema,
    host: hostSchema,
  }),
]);

schema.object(
  {
    allow: schema.boolean(),
    protocol: schema.maybe(
      schema.string({
        validate: (value) => {
          if (value.indexOf('/') >= 0) {
            throw new Error(`protocols should not include slashes`);
          }
        },
      })
    ),
    host: schema.maybe(schema.string()),
  },
  {
    validate: (value) => {
      if (!value.host && !value.protocol) {
        throw new Error(`policy must include a 'host', 'protocol', or both.`);
      }
    },
  }
);

export const config = {
  path: 'externalUrl',
  schema: schema.object({
    policy: schema.arrayOf<IExternalUrlPolicy>(policySchema, {
      defaultValue: [
        {
          host: '*',
          protocol: '*',
          allow: true,
        },
      ],
    }),
  }),
};
