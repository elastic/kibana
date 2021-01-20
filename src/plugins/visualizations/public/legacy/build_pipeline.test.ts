/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { prepareJson, prepareString, buildPipeline } from './build_pipeline';
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
