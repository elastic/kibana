/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import type { MockedKeys } from '@kbn/utility-types/jest';
import { uiSettingsServiceMock } from '../../../../../core/public/mocks';

import { SearchSource } from './search_source';
import { ISearchStartSearchSource, ISearchSource, SearchSourceFields } from './types';

export const searchSourceInstanceMock: MockedKeys<ISearchSource> = {
  setPreferredSearchStrategyId: jest.fn(),
  setFields: jest.fn().mockReturnThis(),
  setField: jest.fn().mockReturnThis(),
  removeField: jest.fn().mockReturnThis(),
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

export const searchSourceCommonMock: jest.Mocked<ISearchStartSearchSource> = {
  create: jest.fn().mockReturnValue(searchSourceInstanceMock),
  createEmpty: jest.fn().mockReturnValue(searchSourceInstanceMock),
};

export const createSearchSourceMock = (fields?: SearchSourceFields) =>
  new SearchSource(fields, {
    getConfig: uiSettingsServiceMock.createStartContract().get,
    search: jest.fn(),
    onResponse: jest.fn().mockImplementation((req, res) => res),
    legacy: {
      callMsearch: jest.fn(),
      loadingCount$: new BehaviorSubject(0),
    },
  });
