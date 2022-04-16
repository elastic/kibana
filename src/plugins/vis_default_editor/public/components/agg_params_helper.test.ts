/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AggGroupNames,
  BUCKET_TYPES,
  IAggConfig,
  IAggType,
  IndexPattern,
} from '@kbn/data-plugin/public';
import type { Schema } from '@kbn/visualizations-plugin/public';

import {
  getAggParamsToRender,
  getAggTypeOptions,
  isInvalidParamsTouched,
} from './agg_params_helper';
import { FieldParamEditor, OrderByParamEditor } from './controls';
import { EditorConfig } from './utils';
import { EditorVisState } from './sidebar/state/reducers';
import { groupAndSortBy } from '../utils';

jest.mock('../utils', () => ({
  groupAndSortBy: jest.fn(() => ['indexedFields']),
}));

describe('DefaultEditorAggParams helpers', () => {
  describe('getAggParamsToRender', () => {
    let agg: IAggConfig;
    let editorConfig: EditorConfig;
    const schemas: Schema[] = [
      {
        name: 'metric',
      } as Schema,
      {
        name: 'metric2',
        hideCustomLabel: true,
      } as Schema,
    ];
    const state = {} as EditorVisState;
    const metricAggs: IAggConfig[] = [];
    const emptyParams = {
      basic: [],
      advanced: [],
    };

    it('should not create any param if they do not have editorComponents', () => {
      agg = {
        type: {
          params: [{ name: 'interval' }],
        },
        schema: 'metric',
      } as IAggConfig;
      const params = getAggParamsToRender({ agg, editorConfig, metricAggs, state, schemas });

      expect(params).toEqual(emptyParams);
    });

    it('should not create any param if there is no agg type', () => {
      agg = { schema: 'metric' } as IAggConfig;
      const params = getAggParamsToRender({ agg, editorConfig, metricAggs, state, schemas });

      expect(params).toEqual(emptyParams);
    });

    it('should not create a param if it is hidden', () => {
      agg = {
        type: {
          params: [{ name: 'interval' }],
        },
      } as IAggConfig;
      editorConfig = {
        interval: {
          hidden: true,
        },
      };
      const params = getAggParamsToRender({ agg, editorConfig, metricAggs, state, schemas });

      expect(params).toEqual(emptyParams);
    });

    it('should skip customLabel param if it is hidden', () => {
      agg = {
        type: {
          params: [{ name: 'customLabel' }],
        },
        schema: 'metric2',
      } as any as IAggConfig;
      const params = getAggParamsToRender({ agg, editorConfig, metricAggs, state, schemas });

      expect(params).toEqual(emptyParams);
    });

    it('should create a basic params field and orderBy', () => {
      const filterFieldTypes = ['number', 'boolean', 'date'];
      agg = {
        type: {
          type: AggGroupNames.Buckets,
          name: BUCKET_TYPES.TERMS,
          params: [
            {
              name: 'field',
              type: 'field',
              filterFieldTypes,
              getAvailableFields: jest.fn((aggConfig: IAggConfig) =>
                aggConfig
                  .getIndexPattern()
                  .fields.filter(({ type }) => filterFieldTypes.includes(type))
              ),
            },
            {
              name: 'orderBy',
            },
          ],
        },
        schema: 'metric',
        getIndexPattern: jest.fn(() => ({
          fields: [
            { name: '@timestamp', type: 'date' },
            { name: 'geo_desc', type: 'string' },
          ],
          getAggregationRestrictions: jest.fn(),
        })),
        params: {
          orderBy: 'orderBy',
          field: 'field',
        },
      } as any as IAggConfig;
      const params = getAggParamsToRender({ agg, editorConfig, metricAggs, state, schemas });

      expect(params).toEqual({
        basic: [
          {
            agg,
            aggParam: agg.type.params[0],
            editorConfig,
            indexedFields: ['indexedFields'],
            paramEditor: FieldParamEditor,
            metricAggs,
            state,
            schemas,
            value: agg.params.field,
          },
          {
            agg,
            aggParam: agg.type.params[1],
            editorConfig,
            indexedFields: [],
            paramEditor: OrderByParamEditor,
            metricAggs,
            state,
            schemas,
            value: agg.params.orderBy,
          },
        ],
        advanced: [],
      });

      // Should be grouped using displayName as label
      expect(groupAndSortBy).toHaveBeenCalledWith(expect.anything(), 'type', 'displayName', 'name');
    });
  });

  describe('getAggTypeOptions', () => {
    it('should return agg type options grouped by subtype', () => {
      const indexPattern = {} as IndexPattern;
      const aggs = getAggTypeOptions(
        { metrics: [] },
        {} as IAggConfig,
        indexPattern,
        'metrics',
        []
      );

      expect(aggs).toEqual(['indexedFields']);
    });
  });

  describe('isInvalidParamsTouched', () => {
    let aggType: IAggType;
    const aggTypeState = {
      touched: false,
      valid: true,
    };
    const aggParams = {
      orderBy: {
        touched: true,
        valid: true,
      },
      orderAgg: {
        touched: true,
        valid: true,
      },
    };

    it('should return aggTypeState touched if there is no aggType', () => {
      const isTouched = isInvalidParamsTouched(aggType, aggTypeState, aggParams);

      expect(isTouched).toBe(aggTypeState.touched);
    });

    it('should return false if there is no invalid params', () => {
      aggType = 'type' as any;
      const isTouched = isInvalidParamsTouched(aggType, aggTypeState, aggParams);

      expect(isTouched).toBeFalsy();
    });

    it('should return true if there is an invalid param, but not every still touched', () => {
      aggType = 'type' as any;
      aggParams.orderAgg.valid = false;
      const isTouched = isInvalidParamsTouched(aggType, aggTypeState, aggParams);

      expect(isTouched).toBeTruthy();
    });
  });
});
