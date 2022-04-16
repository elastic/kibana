/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  CoreStart,
  KibanaRequest,
  SavedObject,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import { IKibanaSearchRequest, ISearchOptions } from '../../../common/search';
import { SearchSessionsConfigSchema } from '../../../config';

export interface IScopedSearchSessionsClient<T = unknown> {
  getId: (request: IKibanaSearchRequest, options: ISearchOptions) => Promise<string>;
  trackId: (
    request: IKibanaSearchRequest,
    searchId: string,
    options: ISearchOptions
  ) => Promise<void>;
  getSearchIdMapping: (sessionId: string) => Promise<Map<string, string>>;
  save: (sessionId: string, attributes: Partial<T>) => Promise<SavedObject<T> | undefined>;
  get: (sessionId: string) => Promise<SavedObject<T>>;
  find: (options: Omit<SavedObjectsFindOptions, 'type'>) => Promise<SavedObjectsFindResponse<T>>;
  update: (sessionId: string, attributes: Partial<T>) => Promise<SavedObjectsUpdateResponse<T>>;
  cancel: (sessionId: string) => Promise<{}>;
  delete: (sessionId: string) => Promise<{}>;
  extend: (sessionId: string, expires: Date) => Promise<SavedObjectsUpdateResponse<T>>;
  getConfig: () => SearchSessionsConfigSchema | null;
}

export interface ISearchSessionService<T = unknown> {
  asScopedProvider: (core: CoreStart) => (request: KibanaRequest) => IScopedSearchSessionsClient<T>;
}
