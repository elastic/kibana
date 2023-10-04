/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
    findByName: jest.fn(),
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
    getTagList: jest.fn(),
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
