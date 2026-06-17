/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromStoredDataViewToAsCodeSavedSchema } from '@kbn/as-code-data-views-transforms';
import { DataViewsAsCodeService } from './data_views_as_code_service';
import type { DataViewLazy } from '@kbn/data-views-plugin/common';
import { dataViewsService } from '@kbn/data-views-plugin/server/mocks';

jest.mock('@kbn/as-code-data-views-transforms', () => ({
  fromStoredDataViewToAsCodeSavedSchema: jest.fn(),
  toStoredDataView: jest.fn(),
}));

const fromStoredDataViewToAsCodeSavedSchemaMock =
  fromStoredDataViewToAsCodeSavedSchema as jest.Mock;

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
  const service = new DataViewsAsCodeService(dataViewsService);
  return { service, mockDataViewsService: dataViewsService };
};

describe('DataViewsAsCodeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

      const transformedData = { title: 'my-index-*', timeFieldName: '@timestamp' };
      fromStoredDataViewToAsCodeSavedSchemaMock.mockReturnValue(transformedData);

      const result = await service.get('dv-1');

      expect(mockDataViewsService.getDataViewLazy).toHaveBeenCalledWith('dv-1');
      expect(mockDataView.toSpec).toHaveBeenCalledTimes(1);
      expect(fromStoredDataViewToAsCodeSavedSchemaMock).toHaveBeenCalledWith(mockSpec);
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
      fromStoredDataViewToAsCodeSavedSchemaMock.mockReturnValue({ title: 'logs-*' });

      const result = await service.get('dv-2');

      expect(result).toEqual({
        id: 'dv-2',
        data: { title: 'logs-*' },
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
      fromStoredDataViewToAsCodeSavedSchemaMock.mockReturnValue({
        id: 'dv-4',
        index_pattern: 'events-*',
      });

      const result = await service.get('dv-4');

      expect(result).toEqual({
        id: 'dv-4',
        data: { index_pattern: 'events-*' },
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
      fromStoredDataViewToAsCodeSavedSchemaMock.mockReturnValue({ transformed: true });

      await service.get('dv-3');

      expect(fromStoredDataViewToAsCodeSavedSchemaMock).toHaveBeenCalledWith(detailedSpec);
    });
  });
});
