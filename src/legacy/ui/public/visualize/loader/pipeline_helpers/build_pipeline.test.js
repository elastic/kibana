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

import { prepareJson, prepareString, buildPipelineVisFunction } from './build_pipeline';

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
    it('handles vega function', () => {
      const params = { spec: 'this is a test' };
      const actual = buildPipelineVisFunction.vega({ params });
      expect(actual).toMatchSnapshot();
    });

    it('handles input_control_vis function', () => {
      const params = {
        some: 'nested',
        data: {
          here: true
        }
      };
      const actual = buildPipelineVisFunction.input_control_vis({ params });
      expect(actual).toMatchSnapshot();
    });

    it('handles metrics/tsvb function', () => {
      const params = { foo: 'bar' };
      const actual = buildPipelineVisFunction.metrics({ params });
      expect(actual).toMatchSnapshot();
    });

    it('handles timelion function', () => {
      const params = { expression: 'foo', interval: 'bar' };
      const actual = buildPipelineVisFunction.timelion({ params });
      expect(actual).toMatchSnapshot();
    });

    it('handles markdown function', () => {
      const params = { markdown: '## hello _markdown_', fontSize: 12, openLinksInNewTab: true, foo: 'bar' };
      const actual = buildPipelineVisFunction.markdown({ params });
      expect(actual).toMatchSnapshot();
    });

    describe('handles table function', () => {
      it('without splits or buckets', () => {
        const params = { foo: 'bar' };
        const schemas = { metric: [0, 1] };
        const actual = buildPipelineVisFunction.table({ params }, schemas);
        expect(actual).toMatchSnapshot();
      });

      it('with splits', () => {
        const params = { foo: 'bar' };
        const schemas = {
          metric: [0],
          split_row: [1, 2],
        };
        const actual = buildPipelineVisFunction.table({ params }, schemas);
        expect(actual).toMatchSnapshot();
      });

      it('with splits and buckets', () => {
        const params = { foo: 'bar' };
        const schemas = {
          metric: [0, 1],
          split_row: [2, 4],
          bucket: [3],
        };
        const actual = buildPipelineVisFunction.table({ params }, schemas);
        expect(actual).toMatchSnapshot();
      });

      it('with showPartialRows=true and showMetricsAtAllLevels=true', () => {
        const params = {
          showMetricsAtAllLevels: true,
          showPartialRows: true,
        };
        const schemas = {
          metric: [1, 2, 4, 5],
          bucket: [0, 3],
        };
        const actual = buildPipelineVisFunction.table({ params }, schemas);
        expect(actual).toMatchSnapshot();
      });

      it('with showPartialRows=true and showMetricsAtAllLevels=false', () => {
        const params = {
          showMetricsAtAllLevels: false,
          showPartialRows: true,
        };
        const schemas = {
          metric: [1, 2, 4, 5],
          bucket: [0, 3],
        };
        const actual = buildPipelineVisFunction.table({ params }, schemas);
        expect(actual).toMatchSnapshot();
      });
    });

    describe('handles metric function', () => {
      const params = { metric: {} };
      it('without buckets', () => {
        const schemas = { metric: [0, 1] };
        const actual = buildPipelineVisFunction.metric({ params }, schemas);
        expect(actual).toMatchSnapshot();
      });

      it('with buckets', () => {
        const schemas = {
          metric: [0, 1],
          group: [2]
        };
        const actual = buildPipelineVisFunction.metric({ params }, schemas);
        expect(actual).toMatchSnapshot();
      });
    });

    describe('handles tagcloud function', () => {
      const params = {};

      it('without buckets', () => {
        const schemas = { metric: [{ accessor: 0 }] };
        const actual = buildPipelineVisFunction.tagcloud({ params }, schemas);
        expect(actual).toMatchSnapshot();
      });

      it('with buckets', () => {
        const schemas = {
          metric: [{ accessor: 0 }],
          segment: [{ accessor: 1 }]
        };
        const actual = buildPipelineVisFunction.tagcloud({ params }, schemas);
        expect(actual).toMatchSnapshot();
      });

      it('with boolean param showLabel', () => {
        const schemas = { metric: [{ accessor: 0 }] };
        const params = { showLabel: false };
        const actual = buildPipelineVisFunction.tagcloud({ params }, schemas);
        expect(actual).toMatchSnapshot();
      });

    });

    describe('handles region_map function', () => {
      const params = { metric: {} };
      it('without buckets', () => {
        const schemas = { metric: [0] };
        const actual = buildPipelineVisFunction.region_map({ params }, schemas);
        expect(actual).toMatchSnapshot();
      });

      it('with buckets', () => {
        const schemas = {
          metric: [0],
          segment: [1, 2]
        };
        const actual = buildPipelineVisFunction.region_map({ params }, schemas);
        expect(actual).toMatchSnapshot();
      });
    });

    it('handles tile_map function', () => {
      const params = { metric: {} };
      const schemas = {
        metric: [0],
        segment: [1, 2],
        geo_centroid: [3, 4]
      };
      const actual = buildPipelineVisFunction.tile_map({ params }, schemas);
      expect(actual).toMatchSnapshot();
    });

    it('handles pie function', () => {
      const params = {};
      const schemas = {
        metric: [0],
        segment: [1, 2]
      };
      const actual = buildPipelineVisFunction.pie({ params }, schemas);
      expect(actual).toMatchSnapshot();
    });
  });
});
