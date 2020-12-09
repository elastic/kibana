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

import { ITagsClient } from '../common';
import { SavedObjectsTaggingApiUi, SavedObjectsTaggingApiUiComponent, ITagsCache } from './api';

const createClientMock = () => {
  const mock: jest.Mocked<ITagsClient> = {
    create: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  return mock;
};

const createCacheMock = () => {
  const mock: jest.Mocked<ITagsCache> = {
    getState: jest.fn(),
    getState$: jest.fn(),
  };

  return mock;
};

interface SavedObjectsTaggingApiMock {
  client: jest.Mocked<ITagsClient>;
  cache: jest.Mocked<ITagsCache>;
  ui: SavedObjectsTaggingApiUiMock;
}

const createApiMock = (): SavedObjectsTaggingApiMock => {
  const mock: SavedObjectsTaggingApiMock = {
    client: createClientMock(),
    cache: createCacheMock(),
    ui: createApiUiMock(),
  };

  return mock;
};

type SavedObjectsTaggingApiUiMock = Omit<jest.Mocked<SavedObjectsTaggingApiUi>, 'components'> & {
  components: SavedObjectsTaggingApiUiComponentMock;
};

const createApiUiMock = () => {
  const mock: SavedObjectsTaggingApiUiMock = {
    components: createApiUiComponentsMock(),
    // TS is very picky with type guards
    hasTagDecoration: jest.fn() as any,
    getSearchBarFilter: jest.fn(),
    getTableColumnDefinition: jest.fn(),
    convertNameToReference: jest.fn(),
    parseSearchQuery: jest.fn(),
    getTagIdsFromReferences: jest.fn(),
    getTagIdFromName: jest.fn(),
    updateTagsReferences: jest.fn(),
    getTag: jest.fn(),
  };

  return mock;
};

type SavedObjectsTaggingApiUiComponentMock = jest.Mocked<SavedObjectsTaggingApiUiComponent>;

const createApiUiComponentsMock = () => {
  const mock: SavedObjectsTaggingApiUiComponentMock = {
    TagList: jest.fn(),
    TagSelector: jest.fn(),
    SavedObjectSaveModalTagSelector: jest.fn(),
  };

  return mock;
};

export const taggingApiMock = {
  create: createApiMock,
  createClient: createClientMock,
  createCache: createCacheMock,
  createUi: createApiUiMock,
  createComponents: createApiUiComponentsMock,
};
