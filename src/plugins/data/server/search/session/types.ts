/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import {
  CoreStart,
  KibanaRequest,
  SavedObject,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
  ElasticsearchClient,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { KueryNode } from '@kbn/es-query';
import { SearchSessionSavedObjectAttributes } from '../../../common';
import { IKibanaSearchRequest, ISearchOptions } from '../../../common/search';
import { SearchSessionsConfigSchema, ConfigSchema } from '../../../config';

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
  find: (
    options: Omit<SavedObjectsFindOptions, 'type'>
  ) => Promise<SavedObjectsFindResponse<SearchSessionSavedObjectAttributes>>;
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
  getConfig: () => SearchSessionsConfigSchema | null;
}

export interface ISearchSessionService {
  asScopedProvider: (core: CoreStart) => (request: KibanaRequest) => IScopedSearchSessionsClient;
}

export enum SearchStatus {
  IN_PROGRESS = 'in_progress',
  ERROR = 'error',
  COMPLETE = 'complete',
}

export interface CheckSearchSessionsDeps {
  savedObjectsClient: SavedObjectsClientContract;
  client: ElasticsearchClient;
  logger: Logger;
}

export interface SearchSessionTaskSetupDeps {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  config: ConfigSchema;
}

export interface SearchSessionTaskStartDeps {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  config: ConfigSchema;
}

export type SearchSessionTaskFn = (
  deps: CheckSearchSessionsDeps,
  config: SearchSessionsConfigSchema
) => Observable<void>;

export type SearchSessionsResponse = SavedObjectsFindResponse<
  SearchSessionSavedObjectAttributes,
  unknown
>;

export type CheckSearchSessionsFn = (
  deps: CheckSearchSessionsDeps,
  config: SearchSessionsConfigSchema,
  filter: KueryNode,
  page: number
) => Observable<SearchSessionsResponse>;
