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
  buildPipeline,
  SchemaConfig,
  Schemas,
} from './build_pipeline';
import { Vis } from '..';
import { dataPluginMock } from '../../../../plugins/data/public/mocks';
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

    it('handles input_control_vis function', () => {
      const params = {
        some: 'nested',
        data: { here: true },
      };
      const actual = buildPipelineVisFunction.input_control_vis(params, schemasDef, uiState);
      expect(actual).toMatchSnapshot();
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
});
