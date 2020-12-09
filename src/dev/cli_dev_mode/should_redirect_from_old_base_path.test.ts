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

import { shouldRedirectFromOldBasePath } from './should_redirect_from_old_base_path';
it.each([
  ['app/foo'],
  ['app/bar'],
  ['login'],
  ['logout'],
  ['status'],
  ['s/1/status'],
  ['s/2/app/foo'],
])('allows %s', (path) => {
  if (!shouldRedirectFromOldBasePath(path)) {
    throw new Error(`expected [${path}] to be redirected from old base path`);
  }
});

it.each([['api/foo'], ['v1/api/bar'], ['bundles/foo/foo.bundle.js']])('blocks %s', (path) => {
  if (shouldRedirectFromOldBasePath(path)) {
    throw new Error(`expected [${path}] to NOT be redirected from old base path`);
  }
});
