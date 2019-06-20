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
import { Vis, VisState } from 'ui/vis';

jest.mock('ui/agg_types/buckets/date_histogram', () => ({}));

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
  });

  describe('buildPipelineVisFunction', () => {
    const visDef: VisState = {
      title: 'title',
      // @ts-ignore
      type: 'type',
      params: {},
    };

    const schemaConfig: SchemaConfig = {
      accessor: 0,
      format: {},
      params: {},
      aggType: '',
    };

    const schemasDef: Schemas = { metric: [schemaConfig] };
    const uiState = {};

    it('handles vega function', () => {
      const vis = {
        ...visDef,
        params: { spec: 'this is a test' },
      };
      const actual = buildPipelineVisFunction.vega(vis, schemasDef, uiState);
      expect(actual).toMatchSnapshot();
    });

    it('handles input_control_vis function', () => {
      const vis = {
        ...visDef,
        params: {
          some: 'nested',
          data: { here: true },
        },
      };
      const actual = buildPipelineVisFunction.input_control_vis(vis, schemasDef, uiState);
      expect(actual).toMatchSnapshot();
    });

    it('handles metrics/tsvb function', () => {
      const vis = { ...visDef, params: { foo: 'bar' } };
      const actual = buildPipelineVisFunction.metrics(vis, schemasDef, uiState);
      expect(actual).toMatchSnapshot();
    });

    it('handles timelion function', () => {
      const vis = {
        ...visDef,
        params: { expression: 'foo', interval: 'bar' },
      };
      const actual = buildPipelineVisFunction.timelion(vis, schemasDef, uiState);
      expect(actual).toMatchSnapshot();
    });

    it('handles markdown function', () => {
      const vis = {
        ...visDef,
        params: {
          markdown: '## hello _markdown_',
          fontSize: 12,
          openLinksInNewTab: true,
          foo: 'bar',
        },
      };
      const actual = buildPipelineVisFunction.markdown(vis, schemasDef, uiState);
      expect(actual).toMatchSnapshot();
    });

    it('handles undefined markdown function', () => {
      const params = { fontSize: 12, openLinksInNewTab: true, foo: 'bar' };
      const actual = buildPipelineVisFunction.markdown({ params });
      expect(actual).toMatchSnapshot();
    });

    describe('handles table function', () => {
      it('without splits or buckets', () => {
        const vis = { ...visDef, params: { foo: 'bar' } };
        const schemas = {
          ...schemasDef,
          metric: [{ ...schemaConfig, accessor: 0 }, { ...schemaConfig, accessor: 1 }],
        };
        const actual = buildPipelineVisFunction.table(vis, schemas, uiState);
        expect(actual).toMatchSnapshot();
      });

      it('with splits', () => {
        const vis = { ...visDef, params: { foo: 'bar' } };
        const schemas = {
          ...schemasDef,
          split_row: [1, 2],
        };
        const actual = buildPipelineVisFunction.table(vis, schemas, uiState);
        expect(actual).toMatchSnapshot();
      });

      it('with splits and buckets', () => {
        const vis = { ...visDef, params: { foo: 'bar' } };
        const schemas = {
          ...schemasDef,
          metric: [{ ...schemaConfig, accessor: 0 }, { ...schemaConfig, accessor: 1 }],
          split_row: [2, 4],
          bucket: [3],
        };
        const actual = buildPipelineVisFunction.table(vis, schemas, uiState);
        expect(actual).toMatchSnapshot();
      });

      it('with showPartialRows=true and showMetricsAtAllLevels=true', () => {
        const vis = {
          ...visDef,
          params: {
            showMetricsAtAllLevels: true,
            showPartialRows: true,
          },
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
        const actual = buildPipelineVisFunction.table(vis, schemas, uiState);
        expect(actual).toMatchSnapshot();
      });

      it('with showPartialRows=true and showMetricsAtAllLevels=false', () => {
        const vis = {
          ...visDef,
          params: {
            showMetricsAtAllLevels: false,
            showPartialRows: true,
          },
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
        const actual = buildPipelineVisFunction.table(vis, schemas, uiState);
        expect(actual).toMatchSnapshot();
      });
    });

    describe('handles metric function', () => {
      const vis = { ...visDef, params: { metric: {} } };
      it('without buckets', () => {
        const schemas = {
          ...schemasDef,
          metric: [{ ...schemaConfig, accessor: 0 }, { ...schemaConfig, accessor: 1 }],
        };
        const actual = buildPipelineVisFunction.metric(vis, schemas, uiState);
        expect(actual).toMatchSnapshot();
      });

      it('with buckets', () => {
        const schemas = {
          ...schemasDef,
          metric: [{ ...schemaConfig, accessor: 0 }, { ...schemaConfig, accessor: 1 }],
          group: [{ accessor: 2 }],
        };
        const actual = buildPipelineVisFunction.metric(vis, schemas, uiState);
        expect(actual).toMatchSnapshot();
      });
    });

    describe('handles tagcloud function', () => {
      it('without buckets', () => {
        const actual = buildPipelineVisFunction.tagcloud(visDef, schemasDef, uiState);
        expect(actual).toMatchSnapshot();
      });

      it('with buckets', () => {
        const schemas = {
          ...schemasDef,
          segment: [{ accessor: 1 }],
        };
        const actual = buildPipelineVisFunction.tagcloud(visDef, schemas, uiState);
        expect(actual).toMatchSnapshot();
      });

      it('with boolean param showLabel', () => {
        const vis = { ...visDef, params: { showLabel: false } };
        const actual = buildPipelineVisFunction.tagcloud(vis, schemasDef, uiState);
        expect(actual).toMatchSnapshot();
      });
    });

    describe('handles region_map function', () => {
      it('without buckets', () => {
        const vis = { ...visDef, params: { metric: {} } };
        const actual = buildPipelineVisFunction.region_map(vis, schemasDef, uiState);
        expect(actual).toMatchSnapshot();
      });

      it('with buckets', () => {
        const schemas = {
          ...schemasDef,
          segment: [1, 2],
        };
        const actual = buildPipelineVisFunction.region_map(visDef, schemas, uiState);
        expect(actual).toMatchSnapshot();
      });
    });

    it('handles tile_map function', () => {
      const vis = { ...visDef, params: { metric: {} } };
      const schemas = {
        ...schemasDef,
        segment: [1, 2],
        geo_centroid: [3, 4],
      };
      const actual = buildPipelineVisFunction.tile_map(vis, schemas, uiState);
      expect(actual).toMatchSnapshot();
    });

    it('handles pie function', () => {
      const schemas = {
        ...schemasDef,
        segment: [1, 2],
      };
      const actual = buildPipelineVisFunction.pie(visDef, schemas, uiState);
      expect(actual).toMatchSnapshot();
    });
  });

  describe('buildPipeline', () => {
    it('calls toExpression on vis_type if it exists', async () => {
      const vis = {
        getCurrentState: () => {},
        getUiState: () => null,
        isHierarchical: () => false,
        aggs: {
          getResponseAggs: () => [],
        },
        type: {
          toExpression: () => 'testing custom expressions',
        }
      };
      const searchSource = {
        getField: () => null,
      };
      const expression = await buildPipeline(vis, { searchSource });
      expect(expression).toMatchSnapshot();
    });
  });
});
