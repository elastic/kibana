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
  injectedMetadataServiceMock,
  uiSettingsServiceMock,
} from '../../../../../core/public/mocks';

import { ISearchSource, SearchSource } from './search_source';
import { SearchSourceFields } from './types';

export const searchSourceInstanceMock: MockedKeys<ISearchSource> = {
  setPreferredSearchStrategyId: jest.fn(),
  setFields: jest.fn().mockReturnThis(),
  setField: jest.fn().mockReturnThis(),
  getId: jest.fn(),
  getFields: jest.fn(),
  getField: jest.fn(),
  getOwnField: jest.fn(),
  create: jest.fn().mockReturnThis(),
  createCopy: jest.fn().mockReturnThis(),
  createChild: jest.fn().mockReturnThis(),
  setParent: jest.fn(),
  getParent: jest.fn().mockReturnThis(),
  fetch: jest.fn().mockResolvedValue({}),
  onRequestStart: jest.fn(),
  getSearchRequestBody: jest.fn(),
  destroy: jest.fn(),
  history: [],
  getSerializedFields: jest.fn(),
  serialize: jest.fn(),
};

export const searchSourceMock = {
  create: jest.fn().mockReturnValue(searchSourceInstanceMock),
  createEmpty: jest.fn().mockReturnValue(searchSourceInstanceMock),
};

export const createSearchSourceMock = (fields?: SearchSourceFields) =>
  new SearchSource(fields, {
    search: jest.fn(),
    legacySearch: {
      esClient: {
        search: jest.fn(),
        msearch: jest.fn(),
      },
    },
    uiSettings: uiSettingsServiceMock.createStartContract(),
    injectedMetadata: injectedMetadataServiceMock.createStartContract(),
  });
