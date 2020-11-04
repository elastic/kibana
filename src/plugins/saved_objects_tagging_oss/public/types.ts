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

import { SavedObjectsTaggingApi } from './api';

export interface SavedObjectTaggingOssPluginSetup {
  /**
   * Register a provider for the tagging API.
   *
   * Only one provider can be registered, subsequent calls to this method will fail.
   *
   * @remarks The promise should not resolve any later than the end of the start lifecycle
   *          (after `getStartServices` resolves). Not respecting this condition may cause
   *          runtime failures.
   */
  registerTaggingApi(provider: Promise<SavedObjectsTaggingApi>): void;
}

export interface SavedObjectTaggingOssPluginStart {
  /**
   * Returns true if the tagging feature is available (if a provider registered the API)
   */
  isTaggingAvailable(): boolean;

  /**
   * Returns the tagging API, if registered.
   * This will always returns a value if `isTaggingAvailable` returns true, and undefined otherwise.
   */
  getTaggingApi(): SavedObjectsTaggingApi | undefined;
}
