/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreStart,
  KibanaRequest,
  SavedObject,
  SavedObjectsFindOptions,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import type { IKibanaSearchRequest, ISearchOptions } from '@kbn/search-types';
import type {
  SearchSessionsFindResponse,
  SearchSessionSavedObjectAttributes,
  SearchSessionStatusResponse,
  SearchSessionStatusesResponse,
  SearchSessionStatus,
  SearchSessionRequestInfo,
} from '../../../common/search';
import type { SearchSessionsConfigSchema } from '../../config';

export { SearchStatus } from '../../../common/search';

export interface IScopedSearchSessionsClient {
  getId: (request: IKibanaSearchRequest, options: ISearchOptions) => Promise<string>;
  trackId: (searchId: string, options: ISearchOptions) => Promise<void>;
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
  updateStatuses: (sessionIds: string[]) => Promise<SearchSessionStatusesResponse>;
  getConfig: () => SearchSessionsConfigSchema;
}

export interface ISearchSessionService {
  asScopedProvider: (core: CoreStart) => (request: KibanaRequest) => IScopedSearchSessionsClient;
}

export interface SessionStatus {
  status: SearchSessionStatus;
  searchStatuses?: SearchSessionRequestInfo[];
}
