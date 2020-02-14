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

export function getNpUiPluginPublicDirs(kbnServer) {
  return Array.from(kbnServer.newPlatform.__internals.uiPlugins.internal.entries()).map(
    ([id, { publicTargetDir }]) => ({
      id,
      path: publicTargetDir,
    })
  );
}

export function isNpUiPluginPublicDirs(something) {
  return (
    Array.isArray(something) &&
    something.every(
      s => typeof s === 'object' && s && typeof s.id === 'string' && typeof s.path === 'string'
    )
  );
}

export function assertIsNpUiPluginPublicDirs(something) {
  if (!isNpUiPluginPublicDirs(something)) {
    throw new TypeError(
      'npUiPluginPublicDirs must be an array of objects with string `id` and `path` properties'
    );
  }
}
