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

import { AggConfig, VisState } from 'ui/vis';
import { FieldParamType, AggType } from 'ui/agg_types';
import { IndexPattern } from 'ui/index_patterns';
import {
  getAggParamsToRender,
  getError,
  getAggTypeOptions,
  isInvalidParamsTouched,
} from './default_editor_agg_params_helper';
import { EditorConfig } from '../../config/types';

jest.mock('ui/agg_types', () => ({
  aggTypes: {
    byType: {
      metrics: [],
      buckets: [],
    },
  },
}));
jest.mock('../default_editor_utils', () => ({
  groupAggregationsBy: jest.fn(() => ['indexedFields']),
}));

describe('DefaultEditorAggParams helpers', () => {
  describe('getAggParamsToRender', () => {
    let agg: AggConfig;
    let editorConfig: EditorConfig;
    const state = {} as VisState;
    const metricAggs: AggConfig[] = [];
    const emptyParams = {
      basic: [],
      advanced: [],
    };

    it('should not create any param if they do not have editorComponents', () => {
      agg = {
        type: {
          params: [{ name: 'interval' }],
        },
        schema: {},
      };
      const params = getAggParamsToRender({ agg, editorConfig, metricAggs, state });

      expect(params).toEqual(emptyParams);
    });

    it('should not create any param if there is no agg type', () => {
      agg = {};
      const params = getAggParamsToRender({ agg, editorConfig, metricAggs, state });

      expect(params).toEqual(emptyParams);
    });

    it('should not create a param if it is hidden', () => {
      agg = {
        type: {
          params: [{ name: 'interval' }],
        },
      };
      editorConfig = {
        interval: {
          hidden: true,
        },
      };
      const params = getAggParamsToRender({ agg, editorConfig, metricAggs, state });

      expect(params).toEqual(emptyParams);
    });

    it('should skip customLabel param if it is hidden', () => {
      agg = {
        type: {
          params: [{ name: 'customLabel' }],
        },
        schema: {
          hideCustomLabel: true,
        },
      };
      const params = getAggParamsToRender({ agg, editorConfig, metricAggs, state });

      expect(params).toEqual(emptyParams);
    });

    it('should create a basic params field and orderBy', () => {
      const filterFieldTypes = ['number', 'boolean', 'date'];
      agg = {
        type: {
          params: [
            {
              name: 'field',
              type: 'field',
              filterFieldTypes,
              getAvailableFields: jest.fn((fields: FieldParamType[]) =>
                fields.filter(({ type }) => filterFieldTypes.includes(type))
              ),
              editorComponent: jest.fn(),
            },
            {
              name: 'orderBy',
              editorComponent: jest.fn(),
            },
          ],
        },
        schema: {},
        getIndexPattern: jest.fn(() => ({
          fields: [{ name: '@timestamp', type: 'date' }, { name: 'geo_desc', type: 'string' }],
        })),
        params: {
          orderBy: 'orderBy',
          field: 'field',
        },
      };
      const params = getAggParamsToRender({ agg, editorConfig, metricAggs, state });

      expect(params).toEqual({
        basic: [
          {
            agg,
            aggParam: agg.type.params[0],
            editorConfig,
            indexedFields: ['indexedFields'],
            paramEditor: agg.type.params[0].editorComponent,
            metricAggs,
            state,
            value: agg.params.field,
          },
          {
            agg,
            aggParam: agg.type.params[1],
            editorConfig,
            indexedFields: [],
            paramEditor: agg.type.params[1].editorComponent,
            metricAggs,
            state,
            value: agg.params.orderBy,
          },
        ],
        advanced: [],
      });
      expect(agg.getIndexPattern).toBeCalledTimes(1);
    });
  });

  describe('getError', () => {
    it('should not have any errors', () => {
      const errors = getError({ schema: { title: 'Split series' } }, false);

      expect(errors).toEqual([]);
    });

    it('should push an error if an agg is too low', () => {
      const errors = getError({ schema: { title: 'Split series' } }, true);

      expect(errors).toEqual(['"Split series" aggs must run before all other buckets!']);
    });

    it('should push an error if a schema is deprecated', () => {
      const errors = getError({ schema: { title: 'Split series', deprecate: true } }, false);

      expect(errors).toEqual(['"Split series" has been deprecated.']);
    });
  });

  describe('getAggTypeOptions', () => {
    it('should return agg type options grouped by subtype', () => {
      const indexPattern = {} as IndexPattern;
      const aggs = getAggTypeOptions({}, indexPattern, 'metrics');

      expect(aggs).toEqual(['indexedFields']);
    });
  });

  describe('isInvalidParamsTouched', () => {
    let aggType: AggType;
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
      aggType = 'type';
      const isTouched = isInvalidParamsTouched(aggType, aggTypeState, aggParams);

      expect(isTouched).toBeFalsy();
    });

    it('should return true if there is an invalid param, but not every still touched', () => {
      aggType = 'type';
      aggParams.orderAgg.valid = false;
      const isTouched = isInvalidParamsTouched(aggType, aggTypeState, aggParams);

      expect(isTouched).toBeTruthy();
    });
  });
});
