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

export type Query = TypeOf<typeof routeValidationConfig.query>;
export type Body = TypeOf<typeof routeValidationConfig.body>;

const acceptedHttpVerb = schema.string({
  validate: (method) => {
    return ['HEAD', 'GET', 'POST', 'PUT', 'DELETE'].some(
      (verb) => verb.toLowerCase() === method.toLowerCase()
    )
      ? undefined
      : `Method must be one of, case insensitive ['HEAD', 'GET', 'POST', 'PUT', 'DELETE']. Received '${method}'.`;
  },
});

const nonEmptyString = schema.string({
  validate: (s) => (s === '' ? 'Expected non-empty string' : undefined),
});

export const routeValidationConfig = {
  query: schema.object({
    method: acceptedHttpVerb,
    path: nonEmptyString,
  }),
  body: schema.stream(),
};
