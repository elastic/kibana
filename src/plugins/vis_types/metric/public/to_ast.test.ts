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
import { VisParams } from './types';

describe('metric vis toExpressionAst function', () => {
  let vis: Vis<VisParams>;

  beforeEach(() => {
    vis = {
      isHierarchical: () => false,
      type: {},
      params: {
        percentageMode: false,
      },
      data: {
        indexPattern: { id: '123' } as any,
        aggs: {
          getResponseAggs: () => [],
          aggs: [],
        } as any,
      },
    } as unknown as Vis<VisParams>;
  });

  it('without params', () => {
    vis.params = { metric: {} } as VisParams;
    const actual = toExpressionAst(vis, {
      timefilter: {} as TimefilterContract,
    });
    expect(actual).toMatchSnapshot();
  });

  it('with percentage mode should have percentage format', () => {
    vis.params = { metric: { percentageMode: true } } as VisParams;
    const actual = toExpressionAst(vis, {
      timefilter: {} as TimefilterContract,
    });
    expect(actual).toMatchSnapshot();
  });
});
