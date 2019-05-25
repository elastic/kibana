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

/**
 * Provides an array of paths for ES source filtering
 *
 * @param {string} type
 * @param {string|array} fields
 * @returns {array}
 */
export function includedFields(type, fields) {
  if (!fields || fields.length === 0) return;

  // convert to an array
  const sourceFields = typeof fields === 'string' ? [fields] : fields;
  const sourceType = type || '*';

  return sourceFields
    .map(f => `${sourceType}.${f}`)
    .concat('namespace')
    .concat('type')
    .concat('references')
    .concat('migrationVersion')
    .concat('updated_at')
    .concat(fields); // v5 compatibility
}
