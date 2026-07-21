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
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { DataViewsAsCodeService } from './data_views_as_code_service';
import {
  DATA_VIEW_SAVED_OBJECT_TYPE,
  type DataViewLazy,
  type DataViewSpec,
} from '@kbn/data-views-plugin/common';
import { dataViewsService } from '@kbn/data-views-plugin/server/mocks';

const createMockDataViewLazy = ({
  id = 'test-id',
  managed = false,
  version = '1',
  namespaces = ['default'],
  spec = {},
  minimalSpec = spec,
  fieldAttrs = (spec.fieldAttrs as Record<string, unknown> | undefined) ?? {},
  savedObjectBody,
}: {
  id?: string;
  managed?: boolean;
  version?: string;
  namespaces?: string[];
  spec?: Record<string, unknown>;
  minimalSpec?: Record<string, unknown>;
  fieldAttrs?: Record<string, unknown>;
  savedObjectBody?: Record<string, unknown>;
} = {}) =>
  ({
    id,
    managed,
    version,
    namespaces,
    toSpec: jest.fn().mockResolvedValue(spec),
    toMinimalSpec: jest.fn().mockResolvedValue(minimalSpec),
    getFieldAttrs: jest.fn().mockReturnValue(new Map(Object.entries(fieldAttrs))),
    getAsSavedObjectBody: jest.fn().mockReturnValue(savedObjectBody ?? spec),
  } as unknown as DataViewLazy);

const createService = () => {
  dataViewsService.clearInstanceCache = jest.fn();
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
    jest.resetAllMocks();
  });

  describe('search', () => {
    it('should search, map data views, and return pagination metadata', async () => {
      const { service, mockSavedObjectsClient } = createService();

      const so1 = {
        id: 'dv-1',
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        references: [],
        score: 1,
        attributes: { title: 'logs-*', timeFieldName: '@timestamp' },
        managed: true,
        version: '2',
        namespaces: ['default', 'space-1'],
      };
      const so2 = {
        id: 'dv-2',
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        references: [],
        score: 1,
        attributes: { title: 'metrics-*' },
        managed: false,
        version: '1',
        namespaces: ['default'],
      };

      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [so1, so2],
        page: 2,
        per_page: 1,
        total: 2,
      });

      const result = await service.search({ page: 2, perPage: 1, search: 'logs' });

      expect(result).toEqual({
        data: [
          {
            id: 'dv-1',
            data: {
              name: undefined,
              index_pattern: 'logs-*',
              time_field: '@timestamp',
            },
            meta: {
              managed: true,
              version: '2',
              namespaces: ['default', 'space-1'],
            },
          },
          {
            id: 'dv-2',
            data: {
              name: undefined,
              index_pattern: 'metrics-*',
              time_field: undefined,
            },
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

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          page: undefined,
          perPage: undefined,
          search: undefined,
        })
      );
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

      const transformedData = getExpectedMappedData(mockSpec);

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

    it('should pass the spec from toMinimalSpec to the transform function', async () => {
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

    it('should restore fieldAttrs from getFieldAttrs so popularity is mapped', async () => {
      const { service, mockDataViewsService } = createService();

      const detailedSpec = {
        title: 'metrics-*',
        fieldAttrs: { bytes: { count: 7, customLabel: 'Bytes' } },
      };
      const minimalSpec = {
        title: 'metrics-*',
        fieldAttrs: { bytes: { customLabel: 'Bytes' } },
      };
      const mockDataView = createMockDataViewLazy({
        id: 'dv-5',
        spec: detailedSpec,
        minimalSpec,
        fieldAttrs: detailedSpec.fieldAttrs,
      });
      mockDataViewsService.getDataViewLazy.mockResolvedValue(mockDataView);

      const result = await service.get('dv-5');

      expect(mockDataView.toMinimalSpec).toHaveBeenCalledTimes(1);
      expect(mockDataView.getFieldAttrs).toHaveBeenCalled();
      expect(result.data).toEqual(getExpectedMappedData(detailedSpec));
    });
  });

  describe('create', () => {
    it('should transform the spec, create and save the data view, and return mapped result', async () => {
      const { service, mockDataViewsService } = createService();

      const inputSpec = { id: 'dv-new', index_pattern: 'logs-*', time_field: '@timestamp' };
      const storedSpec = toStoredDataView(inputSpec);

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
      expect(mockDataView.toMinimalSpec).toHaveBeenCalledTimes(1);
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
      const transformedStoredSpec = toStoredDataView(inputSpec);

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

  describe('upsert', () => {
    const id = 'dv-upsert';
    const inputSpecWithoutId = { index_pattern: 'logs-*', time_field: '@timestamp' };
    const storedSpec = toStoredDataView({ id, ...inputSpecWithoutId });

    it('should update a data view when it already exists', async () => {
      const { service, mockDataViewsService, mockSavedObjectsClient } = createService();

      const existingDataView = createMockDataViewLazy({ id, spec: storedSpec });
      const updatableDataView = createMockDataViewLazy({ id, spec: storedSpec });
      const refetchedDataView = createMockDataViewLazy({
        id,
        managed: true,
        version: '2',
        namespaces: ['default', 'space-1'],
        spec: storedSpec,
      });
      mockDataViewsService.getDataViewLazy
        .mockResolvedValueOnce(existingDataView)
        .mockResolvedValueOnce(refetchedDataView);
      mockDataViewsService.createFromSpecLazy = jest.fn().mockResolvedValue(updatableDataView);
      mockSavedObjectsClient.update.mockResolvedValue({
        id,
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        attributes: updatableDataView.getAsSavedObjectBody(),
        references: [],
        version: '2',
      });

      const result = await service.upsert(id, inputSpecWithoutId);

      expect(mockDataViewsService.getDataViewLazy).toHaveBeenCalledTimes(2);
      expect(mockDataViewsService.getDataViewLazy).toHaveBeenNthCalledWith(1, id);
      expect(mockDataViewsService.getDataViewLazy).toHaveBeenNthCalledWith(2, id);
      expect(mockDataViewsService.createAndSaveDataViewLazy).not.toHaveBeenCalled();
      expect(mockDataViewsService.createFromSpecLazy).toHaveBeenCalledWith(storedSpec);
      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        DATA_VIEW_SAVED_OBJECT_TYPE,
        id,
        updatableDataView.getAsSavedObjectBody(),
        { mergeAttributes: false, refresh: true }
      );
      expect(mockDataViewsService.clearInstanceCache).toHaveBeenCalledWith(id);
      expect(result).toEqual({
        action: 'updated',
        body: {
          id,
          data: getExpectedMappedData(storedSpec),
          meta: {
            managed: true,
            version: '2',
            namespaces: ['default', 'space-1'],
          },
        },
      });
    });

    it('should create a data view when it does not already exist', async () => {
      const { service, mockDataViewsService, mockSavedObjectsClient } = createService();

      mockDataViewsService.getDataViewLazy.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError()
      );
      mockDataViewsService.createFromSpecLazy = jest.fn();
      const createdDataView = createMockDataViewLazy({
        id,
        managed: false,
        version: '1',
        namespaces: ['default'],
        spec: storedSpec,
      });
      mockDataViewsService.createAndSaveDataViewLazy.mockResolvedValue(createdDataView);

      const result = await service.upsert(id, inputSpecWithoutId);

      expect(mockDataViewsService.getDataViewLazy).toHaveBeenCalledWith(id);
      expect(mockDataViewsService.createAndSaveDataViewLazy).toHaveBeenCalledWith(storedSpec);
      expect(mockDataViewsService.createFromSpecLazy).not.toHaveBeenCalled();
      expect(mockSavedObjectsClient.update).not.toHaveBeenCalled();
      expect(result).toEqual({
        action: 'created',
        body: {
          id,
          data: getExpectedMappedData(storedSpec),
          meta: {
            managed: false,
            version: '1',
            namespaces: ['default'],
          },
        },
      });
    });

    it('should propagate errors from createAndSaveDataViewLazy when creating', async () => {
      const { service, mockDataViewsService, mockSavedObjectsClient } = createService();

      const error = new Error('Create failed');
      mockDataViewsService.getDataViewLazy.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError()
      );
      mockDataViewsService.createAndSaveDataViewLazy.mockRejectedValue(error);
      mockDataViewsService.createFromSpecLazy = jest.fn();

      await expect(service.upsert(id, inputSpecWithoutId)).rejects.toThrow('Create failed');
      expect(mockDataViewsService.getDataViewLazy).toHaveBeenCalledWith(id);
      expect(mockDataViewsService.createFromSpecLazy).not.toHaveBeenCalled();
      expect(mockSavedObjectsClient.update).not.toHaveBeenCalled();
    });

    it('should propagate errors from savedObjectsClient.update when updating', async () => {
      const { service, mockDataViewsService, mockSavedObjectsClient } = createService();

      const existingDataView = createMockDataViewLazy({ id, spec: storedSpec });
      const updatableDataView = createMockDataViewLazy({ id, spec: storedSpec });
      mockDataViewsService.getDataViewLazy.mockResolvedValue(existingDataView);
      mockDataViewsService.createFromSpecLazy = jest.fn().mockResolvedValue(updatableDataView);
      mockSavedObjectsClient.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.upsert(id, inputSpecWithoutId)).rejects.toThrow('Update failed');

      expect(mockDataViewsService.createAndSaveDataViewLazy).not.toHaveBeenCalled();
      expect(mockDataViewsService.createFromSpecLazy).toHaveBeenCalledWith(storedSpec);
      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        DATA_VIEW_SAVED_OBJECT_TYPE,
        id,
        updatableDataView.getAsSavedObjectBody(),
        { mergeAttributes: false, refresh: true }
      );
    });
  });
});
