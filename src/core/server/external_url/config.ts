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
    // tools.ietf.org/html/rfc3986#section-3.1
    // scheme = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
    const schemaRegex = /^[a-zA-Z][a-zA-Z0-9\+\-\.]*$/;
    if (!schemaRegex.test(value))
      throw new Error(
        'Protocol must begin with a letter, and can only contain letters, numbers, and the following characters: `+ - .`'
      );
  },
});

const policySchema = schema.object({
  allow: allowSchema,
  protocol: schema.maybe(protocolSchema),
  host: schema.maybe(hostSchema),
});

export const config = {
  path: 'externalUrl',
  schema: schema.object({
    policy: schema.arrayOf<IExternalUrlPolicy>(policySchema, {
      defaultValue: [
        {
          allow: true,
        },
      ],
    }),
  }),
};
