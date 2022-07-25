/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { toExpressionAst } from './to_ast';
import { Vis } from '@kbn/visualizations-plugin/public';

describe('markdown vis toExpressionAst function', () => {
  let vis: Vis;

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
    } as any;
  });

  it('without params', () => {
    vis.params = {};
    // @ts-expect-error
    const actual = toExpressionAst(vis);
    expect(actual).toMatchSnapshot();
  });

  it('with params', () => {
    vis.params = { markdown: '### my markdown', fontSize: 15, openLinksInNewTab: true };
    // @ts-expect-error
    const actual = toExpressionAst(vis);
    expect(actual).toMatchSnapshot();
  });
});
