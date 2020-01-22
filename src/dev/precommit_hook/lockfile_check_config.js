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

export const LOCKFILE_GLOBS = ['**/yarn.lock'];

export const MANIFEST_GLOBS = ['**/package.json'];

export const IGNORE_FILE_GLOBS = [
  // tests aren't used in production, ignore them
  '**/test/**/*',
  // fixtures aren't used in production, ignore them
  '**/*fixtures*/**/*',
  // cypress isn't used in production, ignore it
  'x-pack/legacy/plugins/apm/cypress/*',
];
