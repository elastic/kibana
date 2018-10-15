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

export function normalizeType(type) {
  const normalTypes = {
    string: ['string', 'text', 'keyword', '_type', '_id', '_index'],
    number: [
      'float',
      'half_float',
      'scaled_float',
      'double',
      'integer',
      'long',
      'short',
      'byte',
      'token_count',
      '_version',
    ],
    date: ['date'],
    boolean: ['boolean'],
    null: ['null'],
  };

  const normalizedType = Object.keys(normalTypes).find(t => normalTypes[t].includes(type));

  if (normalizedType) return normalizedType;
  throw new Error(`Canvas does not yet support type: ${type}`);
}
