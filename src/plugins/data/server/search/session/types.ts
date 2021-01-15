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

import {
  CoreStart,
  KibanaRequest,
  SavedObject,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
} from 'kibana/server';
import { IKibanaSearchRequest, ISearchOptions } from '../../../common/search';

export interface IScopedSearchSessionsClient<T = unknown> {
  getId: (request: IKibanaSearchRequest, options: ISearchOptions) => Promise<string>;
  trackId: (
    request: IKibanaSearchRequest,
    searchId: string,
    options: ISearchOptions
  ) => Promise<void>;
  getSearchIdMapping: (sessionId: string) => Promise<Map<string, string>>;
  save: (sessionId: string, attributes: Partial<T>) => Promise<SavedObject<T>>;
  get: (sessionId: string) => Promise<SavedObject<T>>;
  find: (options: Omit<SavedObjectsFindOptions, 'type'>) => Promise<SavedObjectsFindResponse<T>>;
  update: (sessionId: string, attributes: Partial<T>) => Promise<SavedObjectsUpdateResponse<T>>;
  cancel: (sessionId: string) => Promise<{}>;
  extend: (sessionId: string, keepAlive: string) => Promise<SavedObjectsUpdateResponse<T>>;
}

export interface ISearchSessionService<T = unknown> {
  asScopedProvider: (core: CoreStart) => (request: KibanaRequest) => IScopedSearchSessionsClient<T>;
}
