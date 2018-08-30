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

export function canRequire(build, entry) {
  try {
    const resolvedEntry = require.resolve(entry);

    if (resolvedEntry !== entry) {
      // The entry is resolved and we can
      // just return it
      return resolvedEntry;
    }

    // We will try to test if we can resolve
    // this entry against the node_modules path.
    // An error will be thrown and we'll return false
    // in case the entry wasn't found on node_modules
    return require.resolve(build.resolvePath('node_modules', entry));
  } catch (e) {
    return false;
  }
}
