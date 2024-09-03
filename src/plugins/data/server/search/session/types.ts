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
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import type { IKibanaSearchRequest, ISearchOptions } from '@kbn/search-types';
import {
  SearchSessionsFindResponse,
  SearchSessionSavedObjectAttributes,
  SearchSessionStatusResponse,
} from '../../../common/search';
import { SearchSessionsConfigSchema } from '../../config';

export { SearchStatus } from '../../../common/search';

export interface IScopedSearchSessionsClient {
  getId: (request: IKibanaSearchRequest, options: ISearchOptions) => Promise<string>;
  trackId: (
    request: IKibanaSearchRequest,
    searchId: string,
    options: ISearchOptions
  ) => Promise<void>;
  getSearchIdMapping: (sessionId: string) => Promise<Map<string, string>>;
  save: (
    sessionId: string,
    attributes: Partial<SearchSessionSavedObjectAttributes>
  ) => Promise<SavedObject<SearchSessionSavedObjectAttributes> | undefined>;
  get: (sessionId: string) => Promise<SavedObject<SearchSessionSavedObjectAttributes>>;
  find: (options: Omit<SavedObjectsFindOptions, 'type'>) => Promise<SearchSessionsFindResponse>;
  update: (
    sessionId: string,
    attributes: Partial<SearchSessionSavedObjectAttributes>
  ) => Promise<SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>>;
  cancel: (sessionId: string) => Promise<{}>;
  delete: (sessionId: string) => Promise<{}>;
  extend: (
    sessionId: string,
    expires: Date
  ) => Promise<SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>>;
  status: (sessionId: string) => Promise<SearchSessionStatusResponse>;
  getConfig: () => SearchSessionsConfigSchema;
}

export interface ISearchSessionService {
  asScopedProvider: (core: CoreStart) => (request: KibanaRequest) => IScopedSearchSessionsClient;
}
