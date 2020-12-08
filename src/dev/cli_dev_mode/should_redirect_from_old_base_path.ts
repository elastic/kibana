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
 * Determine which requested paths should be redirected from one basePath
 * to another. We only do this for a supset of the paths so that people don't
 * think that specifying a random three character string at the beginning of
 * a URL will work.
 */
export function shouldRedirectFromOldBasePath(path: string) {
  // strip `s/{id}` prefix when checking for need to redirect
  if (path.startsWith('s/')) {
    path = path.split('/').slice(2).join('/');
  }

  const isApp = path.startsWith('app/');
  const isKnownShortPath = ['login', 'logout', 'status'].includes(path);
  return isApp || isKnownShortPath;
}
