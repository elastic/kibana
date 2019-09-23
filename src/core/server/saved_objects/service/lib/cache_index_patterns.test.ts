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

import { SavedObjectsCacheIndexPatterns } from './cache_index_patterns';

const mockGetFieldsForWildcard = jest.fn();
const mockIndexPatternsService: jest.Mock = jest.fn().mockImplementation(() => ({
  getFieldsForWildcard: mockGetFieldsForWildcard,
  getFieldsForTimePattern: jest.fn(),
}));

describe('SavedObjectsRepository', () => {
  let cacheIndexPatterns: SavedObjectsCacheIndexPatterns;

  const fields = [
    {
      aggregatable: true,
      name: 'config.type',
      searchable: true,
      type: 'string',
    },
    {
      aggregatable: true,
      name: 'foo.type',
      searchable: true,
      type: 'string',
    },
    {
      aggregatable: true,
      name: 'bar.type',
      searchable: true,
      type: 'string',
    },
    {
      aggregatable: true,
      name: 'baz.type',
      searchable: true,
      type: 'string',
    },
    {
      aggregatable: true,
      name: 'dashboard.otherField',
      searchable: true,
      type: 'string',
    },
    {
      aggregatable: true,
      name: 'hiddenType.someField',
      searchable: true,
      type: 'string',
    },
  ];

  beforeEach(() => {
    cacheIndexPatterns = new SavedObjectsCacheIndexPatterns();
    jest.clearAllMocks();
  });

  it('setIndexPatterns should return an error object when indexPatternsService is undefined', async () => {
    try {
      await cacheIndexPatterns.setIndexPatterns('test-index');
    } catch (error) {
      expect(error.message).toMatch('indexPatternsService is not defined');
    }
  });

  it('setIndexPatterns should return an error object if getFieldsForWildcard is not defined', async () => {
    mockGetFieldsForWildcard.mockImplementation(() => {
      throw new Error('something happen');
    });
    try {
      cacheIndexPatterns.setIndexPatternsService(new mockIndexPatternsService());
      await cacheIndexPatterns.setIndexPatterns('test-index');
    } catch (error) {
      expect(error.message).toMatch('Index Pattern Error - something happen');
    }
  });

  it('setIndexPatterns should return empty array when getFieldsForWildcard is returning null or undefined', async () => {
    mockGetFieldsForWildcard.mockImplementation(() => null);
    cacheIndexPatterns.setIndexPatternsService(new mockIndexPatternsService());
    await cacheIndexPatterns.setIndexPatterns('test-index');
    expect(cacheIndexPatterns.getIndexPatterns()).toEqual(undefined);
  });

  it('setIndexPatterns should return index pattern when getFieldsForWildcard is returning fields', async () => {
    mockGetFieldsForWildcard.mockImplementation(() => fields);
    cacheIndexPatterns.setIndexPatternsService(new mockIndexPatternsService());
    await cacheIndexPatterns.setIndexPatterns('test-index');
    expect(cacheIndexPatterns.getIndexPatterns()).toEqual({ fields, title: 'test-index' });
  });
});
