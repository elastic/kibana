/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
