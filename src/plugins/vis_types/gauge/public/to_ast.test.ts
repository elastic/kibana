/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimefilterContract } from '@kbn/data-plugin/public';
import { Vis } from '@kbn/visualizations-plugin/public';
import { toExpressionAst } from './to_ast';
import { GaugeVisParams } from './types';

describe('gauge vis toExpressionAst function', () => {
  let vis: Vis<GaugeVisParams>;

  beforeEach(() => {
    vis = {
      isHierarchical: () => false,
      type: {},
      params: {
        gauge: {
          gaugeType: 'Circle',
          scale: {
            show: false,
            labels: false,
            color: 'rgba(105,112,125,0.2)',
          },
          labels: {
            show: true,
          },
          style: {
            subText: 'some custom sublabel',
          },
        },
      },
      data: {
        indexPattern: { id: '123' } as any,
        aggs: {
          getResponseAggs: () => [],
          aggs: [],
        } as any,
      },
    } as unknown as Vis<GaugeVisParams>;
  });

  it('with minimal params', () => {
    const actual = toExpressionAst(vis, {
      timefilter: {} as TimefilterContract,
    });
    expect(actual).toMatchSnapshot();
  });
});
