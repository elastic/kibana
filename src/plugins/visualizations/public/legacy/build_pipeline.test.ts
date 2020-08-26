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
  prepareJson,
  prepareString,
  buildPipelineVisFunction,
  buildVislibDimensions,
  buildPipeline,
  SchemaConfig,
  Schemas,
} from './build_pipeline';
import { Vis } from '..';
import { dataPluginMock } from '../../../../plugins/data/public/mocks';
import { IndexPattern, IAggConfigs } from '../../../../plugins/data/public';
import { parseExpression } from '../../../expressions/common';

describe('visualize loader pipeline helpers: build pipeline', () => {
  describe('prepareJson', () => {
    it('returns a correctly formatted key/value string', () => {
      const expected = `foo='{}' `; // trailing space is expected
      const actual = prepareJson('foo', {});
      expect(actual).toBe(expected);
    });

    it('stringifies provided data', () => {
      const expected = `foo='{\"well\":\"hello\",\"there\":{\"friend\":true}}' `;
      const actual = prepareJson('foo', { well: 'hello', there: { friend: true } });
      expect(actual).toBe(expected);
    });

    it('escapes single quotes', () => {
      const expected = `foo='{\"well\":\"hello \\'hi\\'\",\"there\":{\"friend\":true}}' `;
      const actual = prepareJson('foo', { well: `hello 'hi'`, there: { friend: true } });
      expect(actual).toBe(expected);
    });

    it('returns empty string if data is undefined', () => {
      const actual = prepareJson('foo', undefined);
      expect(actual).toBe('');
    });
  });

  describe('prepareString', () => {
    it('returns a correctly formatted key/value string', () => {
      const expected = `foo='bar' `; // trailing space is expected
      const actual = prepareString('foo', 'bar');
      expect(actual).toBe(expected);
    });

    it('escapes single quotes', () => {
      const expected = `foo='\\'bar\\'' `;
      const actual = prepareString('foo', `'bar'`);
      expect(actual).toBe(expected);
    });

    it('returns empty string if data is undefined', () => {
      const actual = prepareString('foo', undefined);
      expect(actual).toBe('');
    });
  });

  describe('buildPipelineVisFunction', () => {
    let schemaConfig: SchemaConfig;
    let schemasDef: Schemas;
    let uiState: any;

    beforeEach(() => {
      schemaConfig = {
        accessor: 0,
        label: '',
        format: {},
        params: {},
        aggType: '',
      };

      schemasDef = { metric: [schemaConfig] };
      uiState = {};
    });

    it('handles vega function', () => {
      const vis = {
        params: { spec: 'this is a test' },
      };
      const actual = buildPipelineVisFunction.vega(vis.params, schemasDef, uiState);
      expect(actual).toMatchSnapshot();
    });

    it('handles input_control_vis function', () => {
      const params = {
        some: 'nested',
        data: { here: true },
      };
      const actual = buildPipelineVisFunction.input_control_vis(params, schemasDef, uiState);
      expect(actual).toMatchSnapshot();
    });

    it('handles metrics/tsvb function', () => {
      const params = { foo: 'bar' };
      const actual = buildPipelineVisFunction.metrics(params, schemasDef, uiState);
      expect(actual).toMatchSnapshot();
    });

    it('handles timelion function', () => {
      const params = { expression: 'foo', interval: 'bar' };
      const actual = buildPipelineVisFunction.timelion(params, schemasDef, uiState);
      expect(actual).toMatchSnapshot();
    });

    describe('handles table function', () => {
      it('without splits or buckets', () => {
        const params = { foo: 'bar' };
        const schemas = {
          ...schemasDef,
          metric: [
            { ...schemaConfig, accessor: 0 },
            { ...schemaConfig, accessor: 1 },
          ],
        };
        const actual = buildPipelineVisFunction.table(params, schemas, uiState);
        expect(actual).toMatchSnapshot();
      });

      it('with splits', () => {
        const params = { foo: 'bar' };
        const schemas = {
          ...schemasDef,
          split_row: [1, 2],
        };
        const actual = buildPipelineVisFunction.table(params, schemas, uiState);
        expect(actual).toMatchSnapshot();
      });

      it('with splits and buckets', () => {
        const params = { foo: 'bar' };
        const schemas = {
          ...schemasDef,
          metric: [
            { ...schemaConfig, accessor: 0 },
            { ...schemaConfig, accessor: 1 },
          ],
          split_row: [2, 4],
          bucket: [3],
        };
        const actual = buildPipelineVisFunction.table(params, schemas, uiState);
        expect(actual).toMatchSnapshot();
      });

      it('with showPartialRows=true and showMetricsAtAllLevels=true', () => {
        const params = {
          showMetricsAtAllLevels: true,
          showPartialRows: true,
        };
        const schemas = {
          ...schemasDef,
          metric: [
            { ...schemaConfig, accessor: 1 },
            { ...schemaConfig, accessor: 2 },
            { ...schemaConfig, accessor: 4 },
            { ...schemaConfig, accessor: 5 },
          ],
          bucket: [0, 3],
        };
        const actual = buildPipelineVisFunction.table(params, schemas, uiState);
        expect(actual).toMatchSnapshot();
      });

      it('with showPartialRows=true and showMetricsAtAllLevels=false', () => {
        const params = {
          showMetricsAtAllLevels: false,
          showPartialRows: true,
        };
        const schemas = {
          ...schemasDef,
          metric: [
            { ...schemaConfig, accessor: 1 },
            { ...schemaConfig, accessor: 2 },
            { ...schemaConfig, accessor: 4 },
            { ...schemaConfig, accessor: 5 },
          ],
          bucket: [0, 3],
        };
        const actual = buildPipelineVisFunction.table(params, schemas, uiState);
        expect(actual).toMatchSnapshot();
      });
    });

    describe('handles tagcloud function', () => {
      it('without buckets', () => {
        const actual = buildPipelineVisFunction.tagcloud({}, schemasDef, uiState);
        expect(actual).toMatchSnapshot();
      });

      it('with buckets', () => {
        const schemas = {
          ...schemasDef,
          segment: [{ accessor: 1 }],
        };
        const actual = buildPipelineVisFunction.tagcloud({}, schemas, uiState);
        expect(actual).toMatchSnapshot();
      });

      it('with boolean param showLabel', () => {
        const params = { showLabel: false };
        const actual = buildPipelineVisFunction.tagcloud(params, schemasDef, uiState);
        expect(actual).toMatchSnapshot();
      });
    });

    describe('handles region_map function', () => {
      it('without buckets', () => {
        const params = { metric: {} };
        const actual = buildPipelineVisFunction.region_map(params, schemasDef, uiState);
        expect(actual).toMatchSnapshot();
      });

      it('with buckets', () => {
        const schemas = {
          ...schemasDef,
          segment: [1, 2],
        };
        const actual = buildPipelineVisFunction.region_map({}, schemas, uiState);
        expect(actual).toMatchSnapshot();
      });
    });

    it('handles tile_map function', () => {
      const params = { metric: {} };
      const schemas = {
        ...schemasDef,
        segment: [1, 2],
        geo_centroid: [3, 4],
      };
      const actual = buildPipelineVisFunction.tile_map(params, schemas, uiState);
      expect(actual).toMatchSnapshot();
    });

    it('handles pie function', () => {
      const schemas = {
        ...schemasDef,
        segment: [1, 2],
      };
      const actual = buildPipelineVisFunction.pie({}, schemas, uiState);
      expect(actual).toMatchSnapshot();
    });
  });

  describe('buildPipeline', () => {
    const dataStart = dataPluginMock.createStartContract();

    it('calls toExpression on vis_type if it exists', async () => {
      const vis = ({
        getState: () => {},
        isHierarchical: () => false,
        data: {
          aggs: {
            getResponseAggs: () => [],
          },
          searchSource: {
            getField: jest.fn(),
            getParent: jest.fn(),
          },
        },
        // @ts-ignore
        type: {
          toExpressionAst: () => parseExpression('test'),
        },
      } as unknown) as Vis;
      const expression = await buildPipeline(vis, {
        timefilter: dataStart.query.timefilter.timefilter,
      });
      expect(expression).toMatchSnapshot();
    });
  });

  describe('buildVislibDimensions', () => {
    const dataStart = dataPluginMock.createStartContract();

    let aggs: IAggConfigs;
    let vis: Vis;
    let params: any;

    beforeEach(() => {
      aggs = dataStart.search.aggs.createAggConfigs({} as IndexPattern, [
        {
          id: '0',
          enabled: true,
          type: 'count',
          schema: 'metric',
          params: {},
        },
      ]);

      params = {
        searchSource: null,
        timefilter: dataStart.query.timefilter.timefilter,
        timeRange: null,
      };
    });

    describe('test y dimension format for histogram chart', () => {
      beforeEach(() => {
        vis = {
          // @ts-ignore
          type: {
            name: 'histogram',
          },
          params: {
            seriesParams: [
              {
                data: { id: '0' },
                valueAxis: 'axis-y',
              },
            ],
            valueAxes: [
              {
                id: 'axis-y',
                scale: {
                  mode: 'normal',
                },
              },
            ],
          },
          data: {
            aggs,
            searchSource: {} as any,
          },
          isHierarchical: () => {
            return false;
          },
        };
      });

      it('with one numeric metric in regular moder', async () => {
        const dimensions = await buildVislibDimensions(vis, params);
        const expected = { id: 'number' };
        const actual = dimensions.y[0].format;
        expect(actual).toEqual(expected);
      });

      it('with one numeric metric in percentage mode', async () => {
        vis.params.valueAxes[0].scale.mode = 'percentage';
        const dimensions = await buildVislibDimensions(vis, params);
        const expected = { id: 'percent' };
        const actual = dimensions.y[0].format;
        expect(actual).toEqual(expected);
      });

      it('with two numeric metrics, mixed normal and percent mode should have corresponding formatters', async () => {
        aggs.createAggConfig({
          id: '5',
          enabled: true,
          type: 'count',
          schema: 'metric',
          params: {},
        });

        vis.params = {
          seriesParams: [
            {
              data: { id: '0' },
              valueAxis: 'axis-y-1',
            },
            {
              data: { id: '5' },
              valueAxis: 'axis-y-2',
            },
          ],
          valueAxes: [
            {
              id: 'axis-y-1',
              scale: {
                mode: 'normal',
              },
            },
            {
              id: 'axis-y-2',
              scale: {
                mode: 'percentage',
              },
            },
          ],
        };

        const dimensions = await buildVislibDimensions(vis, params);
        const expectedY1 = { id: 'number' };
        const expectedY2 = { id: 'percent' };
        expect(dimensions.y[0].format).toEqual(expectedY1);
        expect(dimensions.y[1].format).toEqual(expectedY2);
      });
    });

    describe('test y dimension format for gauge chart', () => {
      beforeEach(() => {
        vis = {
          // @ts-ignore
          type: {
            name: 'gauge',
          },
          params: { gauge: {} },
          data: {
            aggs,
            searchSource: {} as any,
          },
          isHierarchical: () => {
            return false;
          },
        };
      });

      it('with percentageMode = false', async () => {
        vis.params.gauge.percentageMode = false;
        const dimensions = await buildVislibDimensions(vis, params);
        const expected = { id: 'number' };
        const actual = dimensions.y[0].format;
        expect(actual).toEqual(expected);
      });

      it('with percentageMode = true', async () => {
        vis.params.gauge.percentageMode = true;
        const dimensions = await buildVislibDimensions(vis, params);
        const expected = { id: 'percent' };
        const actual = dimensions.y[0].format;
        expect(actual).toEqual(expected);
      });
    });
  });
});
