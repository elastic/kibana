/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createStubDataView } from '@kbn/data-views-plugin/common/mocks';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import type { AggsCommonStart } from '../search';
import { BUCKET_TYPES } from '../search/aggs/buckets/bucket_agg_types';
import { DatatableUtilitiesService } from './datatable_utilities_service';

describe('DatatableUtilitiesService', () => {
  let aggs: jest.Mocked<AggsCommonStart>;
  let dataViews: jest.Mocked<DataViewsContract>;
  let datatableUtilitiesService: DatatableUtilitiesService;

  beforeEach(() => {
    aggs = {
      createAggConfigs: jest.fn(),
      types: { get: jest.fn() },
    } as unknown as typeof aggs;
    dataViews = {
      get: jest.fn(),
    } as unknown as typeof dataViews;

    datatableUtilitiesService = new DatatableUtilitiesService(aggs, dataViews, fieldFormatsMock);
  });

  describe('clearField', () => {
    it('should delete the field reference', () => {
      const column = { meta: { field: 'foo' } } as DatatableColumn;

      datatableUtilitiesService.clearField(column);

      expect(column).not.toHaveProperty('meta.field');
    });
  });

  describe('clearFieldFormat', () => {
    it('should remove field format', () => {
      const column = { meta: { params: { id: 'number' } } } as DatatableColumn;
      datatableUtilitiesService.clearFieldFormat(column);

      expect(column).not.toHaveProperty('meta.params');
    });
  });

  describe('getDataView', () => {
    it('should return a data view instance', async () => {
      const column = { meta: { index: 'index' } } as DatatableColumn;
      const dataView = {} as ReturnType<DataViewsContract['get']>;
      dataViews.get.mockReturnValue(dataView);

      await expect(datatableUtilitiesService.getDataView(column)).resolves.toBe(dataView);
      expect(dataViews.get).toHaveBeenCalledWith('index');
    });

    it('should return undefined when there is no index metadata', async () => {
      const column = { meta: {} } as DatatableColumn;

      await expect(datatableUtilitiesService.getDataView(column)).resolves.toBeUndefined();
      expect(dataViews.get).not.toHaveBeenCalled();
    });
  });

  describe('getField', () => {
    it('should return a data view field instance', async () => {
      const column = { meta: { field: 'field', index: 'index' } } as DatatableColumn;
      const dataView = createStubDataView({ spec: {} });
      const field = {} as any;
      jest.spyOn(datatableUtilitiesService, 'getDataView').mockResolvedValue(dataView);
      jest.spyOn(dataView, 'getFieldByName').mockReturnValue(field);

      await expect(datatableUtilitiesService.getField(column)).resolves.toBe(field);
      expect(dataView.getFieldByName).toHaveBeenCalledWith('field');
    });

    it('should return undefined when there is no field metadata', async () => {
      const column = { meta: {} } as DatatableColumn;

      await expect(datatableUtilitiesService.getField(column)).resolves.toBeUndefined();
    });
  });

  describe('getFieldFormat', () => {
    it('should deserialize field format', () => {
      const column = { meta: { params: { id: 'number' } } } as DatatableColumn;
      const fieldFormat = datatableUtilitiesService.getFieldFormat(column);

      expect(fieldFormat).toBeInstanceOf(FieldFormat);
    });
  });

  describe('getInterval', () => {
    it('should return a histogram interval', () => {
      const column = {
        meta: { sourceParams: { params: { interval: '1d' } } },
      } as unknown as DatatableColumn;

      expect(datatableUtilitiesService.getInterval(column)).toBe('1d');
    });
  });

  describe('getNumberHistogramInterval', () => {
    it('should return nothing on column from other data source', () => {
      expect(
        datatableUtilitiesService.getNumberHistogramInterval({
          id: 'test',
          name: 'test',
          meta: {
            type: 'date',
            source: 'essql',
          },
        })
      ).toEqual(undefined);
    });

    it('should return nothing on non histogram column', () => {
      expect(
        datatableUtilitiesService.getNumberHistogramInterval({
          id: 'test',
          name: 'test',
          meta: {
            type: 'date',
            source: 'esaggs',
            sourceParams: {
              type: BUCKET_TYPES.TERMS,
            },
          },
        })
      ).toEqual(undefined);
    });

    it('should return interval on resolved auto interval', () => {
      expect(
        datatableUtilitiesService.getNumberHistogramInterval({
          id: 'test',
          name: 'test',
          meta: {
            type: 'date',
            source: 'esaggs',
            sourceParams: {
              type: BUCKET_TYPES.HISTOGRAM,
              params: {
                interval: 'auto',
                used_interval: 20,
              },
            },
          },
        })
      ).toEqual(20);
    });

    it('should return interval on fixed interval', () => {
      expect(
        datatableUtilitiesService.getNumberHistogramInterval({
          id: 'test',
          name: 'test',
          meta: {
            type: 'date',
            source: 'esaggs',
            sourceParams: {
              type: BUCKET_TYPES.HISTOGRAM,
              params: {
                interval: 7,
                used_interval: 7,
              },
            },
          },
        })
      ).toEqual(7);
    });

    it('should return `undefined` if information is not available', () => {
      expect(
        datatableUtilitiesService.getNumberHistogramInterval({
          id: 'test',
          name: 'test',
          meta: {
            type: 'date',
            source: 'esaggs',
            sourceParams: {
              type: BUCKET_TYPES.HISTOGRAM,
              params: {},
            },
          },
        })
      ).toEqual(undefined);
    });
  });

  describe('getTotalCount', () => {
    it('should return a total hits count', () => {
      const table = {
        meta: { statistics: { totalCount: 100 } },
      } as unknown as Datatable;

      expect(datatableUtilitiesService.getTotalCount(table)).toBe(100);
    });
  });

  describe('hasPrecisionError', () => {
    test('should return true if there is a precision error in the column', () => {
      expect(
        datatableUtilitiesService.hasPrecisionError({
          meta: {
            sourceParams: {
              hasPrecisionError: true,
            },
          },
        } as unknown as DatatableColumn)
      ).toBeTruthy();
    });
    test('should return false if there is no precision error in the column', () => {
      expect(
        datatableUtilitiesService.hasPrecisionError({
          meta: {
            sourceParams: {
              hasPrecisionError: false,
            },
          },
        } as unknown as DatatableColumn)
      ).toBeFalsy();
    });
    test('should return false if precision error is not defined', () => {
      expect(
        datatableUtilitiesService.hasPrecisionError({
          meta: {
            sourceParams: {},
          },
        } as unknown as DatatableColumn)
      ).toBeFalsy();
    });
  });

  describe('setFieldFormat', () => {
    it('should set new field format', () => {
      const column = { meta: {} } as DatatableColumn;
      const fieldFormat = fieldFormatsMock.deserialize({ id: 'number' });
      datatableUtilitiesService.setFieldFormat(column, fieldFormat);

      expect(column.meta.params).toEqual(
        expect.objectContaining({
          id: expect.anything(),
          params: undefined,
        })
      );
    });
  });
});
