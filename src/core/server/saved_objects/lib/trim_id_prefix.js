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

function assertNonEmptyString(value, name) {
  if (!value || typeof value !== 'string') {
    throw new TypeError(`Expected "${value}" to be a ${name}`);
  }
}

/**
 *  Trim the prefix from the id of a saved object doc
 *
 *  @param  {string} id
 *  @param  {string} type
 *  @return {string}
 */
export function trimIdPrefix(id, type) {
  assertNonEmptyString(id, 'document id');
  assertNonEmptyString(type, 'saved object type');

  const prefix = `${type}:`;

  if (!id.startsWith(prefix)) {
    return id;
  }

  return id.slice(prefix.length);
}
