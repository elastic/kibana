/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  fromStoredDataViewToAsCodeSavedSchema,
  toStoredDataView,
} from '@kbn/as-code-data-views-transforms';
import { DataViewsAsCodeService } from './data_views_as_code_service';
import {
  DATA_VIEW_SAVED_OBJECT_TYPE,
  type DataViewLazy,
  type DataViewSpec,
} from '@kbn/data-views-plugin/common';
import { dataViewsService } from '@kbn/data-views-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

const createMockDataViewLazy = ({
  id = 'test-id',
  managed = false,
  version = '1',
  namespaces = ['default'],
  spec = {},
}: {
  id?: string;
  managed?: boolean;
  version?: string;
  namespaces?: string[];
  spec?: Record<string, unknown>;
} = {}) =>
  ({
    id,
    managed,
    version,
    namespaces,
    toSpec: jest.fn().mockResolvedValue(spec),
  } as unknown as DataViewLazy);

const createService = () => {
  const mockSavedObjectsClient = savedObjectsClientMock.create();
  const service = new DataViewsAsCodeService(dataViewsService, mockSavedObjectsClient);
  return { service, mockDataViewsService: dataViewsService, mockSavedObjectsClient };
};

const getExpectedMappedData = (spec: DataViewSpec) => {
  const { id: _id, ...data } = fromStoredDataViewToAsCodeSavedSchema(spec);
  return data;
};

describe('DataViewsAsCodeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should search, map data views, and return pagination metadata', async () => {
      const { service, mockDataViewsService, mockSavedObjectsClient } = createService();

      const so1 = {
        id: 'dv-1',
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        references: [],
        score: 1,
        attributes: { title: 'logs-*' },
      };
      const so2 = {
        id: 'dv-2',
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        references: [],
        score: 1,
        attributes: { title: 'metrics-*' },
      };

      const spec1 = { id: 'dv-1', title: 'logs-*', timeFieldName: '@timestamp' } as DataViewSpec;
      const spec2 = { id: 'dv-2', title: 'metrics-*' } as DataViewSpec;

      const dataView1 = createMockDataViewLazy({
        id: 'dv-1',
        managed: true,
        version: '2',
        namespaces: ['default', 'space-1'],
        spec: spec1,
      });
      const dataView2 = createMockDataViewLazy({
        id: 'dv-2',
        managed: false,
        version: '1',
        namespaces: ['default'],
        spec: spec2,
      });

      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [so1, so2],
        page: 2,
        per_page: 1,
        total: 2,
      });
      mockDataViewsService.savedObjectToSpec = jest
        .fn()
        .mockImplementation((savedObject: { id: string }) =>
          savedObject.id === 'dv-1' ? spec1 : spec2
        );
      mockDataViewsService.createDataViewLazy = jest
        .fn()
        .mockImplementation((spec: DataViewSpec) =>
          Promise.resolve(spec.id === 'dv-1' ? dataView1 : dataView2)
        );

      const result = await service.search({ page: 2, perPage: 1, search: 'logs' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        page: 2,
        perPage: 1,
        search: 'logs',
      });
      expect(mockDataViewsService.savedObjectToSpec).toHaveBeenCalledTimes(2);
      expect(mockDataViewsService.savedObjectToSpec).toHaveBeenNthCalledWith(1, so1);
      expect(mockDataViewsService.savedObjectToSpec).toHaveBeenNthCalledWith(2, so2);
      expect(mockDataViewsService.createDataViewLazy).toHaveBeenCalledTimes(2);
      expect(mockDataViewsService.createDataViewLazy).toHaveBeenNthCalledWith(1, spec1);
      expect(mockDataViewsService.createDataViewLazy).toHaveBeenNthCalledWith(2, spec2);

      expect(result).toEqual({
        data: [
          {
            id: 'dv-1',
            data: getExpectedMappedData(spec1),
            meta: {
              managed: true,
              version: '2',
              namespaces: ['default', 'space-1'],
            },
          },
          {
            id: 'dv-2',
            data: getExpectedMappedData(spec2),
            meta: {
              managed: false,
              version: '1',
              namespaces: ['default'],
            },
          },
        ],
        meta: {
          page: 2,
          per_page: 1,
          total: 2,
        },
      });
    });

    it('should not pass a perPage when not provided', async () => {
      const { service, mockSavedObjectsClient } = createService();

      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [],
        page: 1,
        per_page: 25,
        total: 0,
      });

      const result = await service.search({});

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        page: undefined,
        perPage: undefined,
        search: undefined,
      });
      expect(result).toEqual({
        data: [],
        meta: {
          page: 1,
          per_page: 25,
          total: 0,
        },
      });
    });

    it('should propagate errors from savedObjectsClient.find', async () => {
      const { service, mockSavedObjectsClient } = createService();

      const error = new Error('Search failed');
      mockSavedObjectsClient.find.mockRejectedValue(error);

      await expect(service.search({ page: 1, perPage: 5, search: 'logs' })).rejects.toThrow(
        'Search failed'
      );
      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        page: 1,
        perPage: 5,
        search: 'logs',
      });
    });
  });

  describe('get', () => {
    it('should return a mapped data view for a given id', async () => {
      const { service, mockDataViewsService } = createService();

      const mockSpec = { title: 'my-index-*', timeFieldName: '@timestamp' };
      const mockDataView = createMockDataViewLazy({
        id: 'dv-1',
        managed: true,
        version: '2',
        namespaces: ['default', 'space-1'],
        spec: mockSpec,
      });
      mockDataViewsService.getDataViewLazy.mockResolvedValue(mockDataView);

      const transformedData = getExpectedMappedData(mockSpec as DataViewSpec);

      const result = await service.get('dv-1');

      expect(mockDataViewsService.getDataViewLazy).toHaveBeenCalledWith('dv-1');
      expect(result).toEqual({
        id: 'dv-1',
        data: transformedData,
        meta: {
          managed: true,
          version: '2',
          namespaces: ['default', 'space-1'],
        },
      });
    });

    it('should propagate errors from getDataViewLazy', async () => {
      const { service, mockDataViewsService } = createService();

      const error = new Error('Data view not found');
      mockDataViewsService.getDataViewLazy.mockRejectedValue(error);

      await expect(service.get('non-existent')).rejects.toThrow('Data view not found');
      expect(mockDataViewsService.getDataViewLazy).toHaveBeenCalledWith('non-existent');
    });

    it('should handle a data view with default meta values', async () => {
      const { service, mockDataViewsService } = createService();

      const mockDataView = createMockDataViewLazy({
        id: 'dv-2',
        managed: false,
        namespaces: [],
        spec: { title: 'logs-*' },
      });
      mockDataViewsService.getDataViewLazy.mockResolvedValue(mockDataView);

      const result = await service.get('dv-2');

      expect(result).toEqual({
        id: 'dv-2',
        data: getExpectedMappedData({ title: 'logs-*' }),
        meta: {
          managed: false,
          version: '1',
          namespaces: [],
        },
      });
    });

    it('should omit id from data when the transform includes it', async () => {
      const { service, mockDataViewsService } = createService();

      const mockDataView = createMockDataViewLazy({
        id: 'dv-4',
        spec: { title: 'events-*', id: 'dv-4' },
      });
      mockDataViewsService.getDataViewLazy.mockResolvedValue(mockDataView);

      const result = await service.get('dv-4');

      expect(result).toEqual({
        id: 'dv-4',
        data: getExpectedMappedData({ title: 'events-*', id: 'dv-4' }),
        meta: {
          managed: false,
          version: '1',
          namespaces: ['default'],
        },
      });
    });

    it('should pass the spec from toSpec to the transform function', async () => {
      const { service, mockDataViewsService } = createService();

      const detailedSpec = {
        title: 'metrics-*',
        timeFieldName: '@timestamp',
        sourceFilters: [{ value: 'bytes' }],
        fieldFormats: { bytes: { id: 'number' } },
      };
      const mockDataView = createMockDataViewLazy({
        id: 'dv-3',
        spec: detailedSpec,
      });
      mockDataViewsService.getDataViewLazy.mockResolvedValue(mockDataView);

      const result = await service.get('dv-3');

      expect(result.data).toEqual(getExpectedMappedData(detailedSpec));
    });
  });

  describe('create', () => {
    it('should transform the spec, create and save the data view, and return mapped result', async () => {
      const { service, mockDataViewsService } = createService();

      const inputSpec = { id: 'dv-new', index_pattern: 'logs-*', time_field: '@timestamp' };
      const storedSpec = toStoredDataView(inputSpec) as DataViewSpec;

      const mockDataView = createMockDataViewLazy({
        id: 'dv-new',
        managed: false,
        version: '1',
        namespaces: ['default'],
        spec: storedSpec,
      });
      mockDataViewsService.createAndSaveDataViewLazy.mockResolvedValue(mockDataView);

      const transformedData = getExpectedMappedData(storedSpec);

      const result = await service.create(inputSpec);

      expect(mockDataViewsService.createAndSaveDataViewLazy).toHaveBeenCalledWith(storedSpec);
      expect(mockDataView.toSpec).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        id: 'dv-new',
        data: transformedData,
        meta: {
          managed: false,
          version: '1',
          namespaces: ['default'],
        },
      });
    });

    it('should propagate errors from createAndSaveDataViewLazy', async () => {
      const { service, mockDataViewsService } = createService();

      const error = new Error('Failed to create data view');
      mockDataViewsService.createAndSaveDataViewLazy.mockRejectedValue(error);

      await expect(service.create({ id: 'dv-fail', index_pattern: 'logs-*' })).rejects.toThrow(
        'Failed to create data view'
      );
    });

    it('should pass the transformed spec to createAndSaveDataViewLazy', async () => {
      const { service, mockDataViewsService } = createService();

      const inputSpec = {
        id: 'dv-complex',
        index_pattern: 'metrics-*',
        time_field: '@timestamp',
        field_filters: ['bytes'],
      };
      const transformedStoredSpec = toStoredDataView(inputSpec) as DataViewSpec;

      const mockDataView = createMockDataViewLazy({
        id: 'dv-complex',
        spec: transformedStoredSpec,
      });
      mockDataViewsService.createAndSaveDataViewLazy.mockResolvedValue(mockDataView);

      await service.create(inputSpec);

      expect(mockDataViewsService.createAndSaveDataViewLazy).toHaveBeenCalledWith(
        transformedStoredSpec
      );
    });

    it('should return correct meta from the created data view', async () => {
      const { service, mockDataViewsService } = createService();

      const mockDataView = createMockDataViewLazy({
        id: 'dv-meta',
        managed: true,
        version: '3',
        namespaces: ['default', 'space-a'],
        spec: { title: 'test-*' },
      });
      mockDataViewsService.createAndSaveDataViewLazy.mockResolvedValue(mockDataView);

      const result = await service.create({ id: 'dv-meta', index_pattern: 'test-*' });

      expect(result.meta).toEqual({
        managed: true,
        version: '3',
        namespaces: ['default', 'space-a'],
      });
    });
  });

  describe('delete', () => {
    it('should call delete for an existing id', async () => {
      const { service, mockDataViewsService } = createService();

      mockDataViewsService.delete.mockResolvedValue(undefined);

      await expect(service.delete('dv-existing')).resolves.toBeUndefined();
      expect(mockDataViewsService.delete).toHaveBeenCalledWith('dv-existing');
    });

    it('should propagate errors when deleting a non-existent id', async () => {
      const { service, mockDataViewsService } = createService();

      const error = new Error('Data view not found');
      mockDataViewsService.delete.mockRejectedValue(error);

      await expect(service.delete('dv-missing')).rejects.toThrow('Data view not found');
      expect(mockDataViewsService.delete).toHaveBeenCalledWith('dv-missing');
    });
  });
});
