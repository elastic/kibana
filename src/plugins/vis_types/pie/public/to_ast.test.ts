/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Vis } from '../../../visualizations/public';

import { PieVisParams } from '../../../chart_expressions/expression_pie/common';
import { samplePieVis } from './sample_vis.test.mocks';
import { toExpressionAst } from './to_ast';

describe('vis type pie vis toExpressionAst function', () => {
  let vis: Vis<PieVisParams>;
  const params = {
    timefilter: {},
    timeRange: {},
    abortSignal: {},
  } as any;

  beforeEach(() => {
    vis = samplePieVis as any;
  });

  it('should match basic snapshot', async () => {
    const actual = await toExpressionAst(vis, params);
    expect(actual).toMatchSnapshot();
  });
});
