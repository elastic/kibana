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

import { SavedQueryAttributes } from '../index';
import { saveQuery } from './saved_query_service';
import { FilterStateStore } from '@kbn/es-query';

const savedQueryAttributes: SavedQueryAttributes = {
  title: 'foo',
  description: 'bar',
  query: {
    language: 'kuery',
    query: 'response:200',
  },
};

const savedQueryAttributesWithFilters: SavedQueryAttributes = {
  ...savedQueryAttributes,
  filters: [
    {
      query: { match_all: {} },
      $state: { store: FilterStateStore.APP_STATE },
      meta: {
        disabled: false,
        negate: false,
        alias: null,
      },
    },
  ],
  timefilter: {
    timeTo: 'now',
    timeFrom: 'now-15m',
    refreshInterval: {
      pause: false,
      value: 0,
    },
  },
};

const mockSavedObjectsClient = {
  create: jest.fn(),
  error: jest.fn(),
};

jest.mock('ui/chrome', () => {
  return {
    getSavedObjectsClient: () => {
      return mockSavedObjectsClient;
    },
  };
});

describe('saved query service', () => {
  afterEach(() => {
    mockSavedObjectsClient.create.mockReset();
  });

  describe('saveQuery', function() {
    it('should create a saved object for the given attributes', async () => {
      mockSavedObjectsClient.create.mockReturnValue({
        id: '1234',
        attributes: savedQueryAttributes,
      });

      const response = await saveQuery(savedQueryAttributes);
      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith('query', savedQueryAttributes);
      expect(response).toEqual({ id: '1234', attributes: savedQueryAttributes });
    });

    it('should accept an explicit ID', async () => {
      mockSavedObjectsClient.create.mockReturnValue({
        id: '1234',
        attributes: savedQueryAttributes,
      });

      const response = await saveQuery(savedQueryAttributes, '1234');
      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith('query', savedQueryAttributes, {
        id: '1234',
        overwrite: true,
      });
      expect(response).toEqual({ id: '1234', attributes: savedQueryAttributes });
    });

    it('should optionally accept filters and timefilters in object format', async () => {
      const serializedSavedQueryAttributesWithFilters = {
        ...savedQueryAttributesWithFilters,
        filters: JSON.stringify(savedQueryAttributesWithFilters.filters),
        timefilter: JSON.stringify(savedQueryAttributesWithFilters.timefilter),
      };

      mockSavedObjectsClient.create.mockReturnValue({
        id: '1234',
        attributes: serializedSavedQueryAttributesWithFilters,
      });

      const response = await saveQuery(savedQueryAttributesWithFilters);

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        'query',
        serializedSavedQueryAttributesWithFilters
      );
      expect(response).toEqual({ id: '1234', attributes: savedQueryAttributesWithFilters });
    });

    it('should throw an error when saved objects client returns error', async () => {
      mockSavedObjectsClient.create.mockReturnValue({
        error: {
          error: '123',
          message: 'An Error',
        },
      });

      let error = null;
      try {
        await saveQuery(savedQueryAttributes);
      } catch (e) {
        error = e;
      }
      expect(error).not.toBe(null);
    });

    it('should test all the other service methods', () => {
      throw new Error('implement me');
    });
  });
});
