/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreStart } from '../../../../../core/server';
import { KibanaRequest } from '../../../../../core/server/http/router/request';
import type {
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
} from '../../../../../core/server/saved_objects/service/saved_objects_client';
import type { SavedObjectsFindOptions } from '../../../../../core/server/saved_objects/types';
import type { SavedObject } from '../../../../../core/types/saved_objects';
import type { IKibanaSearchRequest, ISearchOptions } from '../../../common/search/types';
import type { SearchSessionsConfigSchema } from '../../../config';

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
