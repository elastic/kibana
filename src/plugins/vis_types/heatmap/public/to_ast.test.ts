/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Vis } from 'src/plugins/visualizations/public';
import { sampleAreaVis } from './sample_vis.test.mocks';
import { buildExpression } from '../../../expressions/public';

import { toExpressionAst } from './to_ast';
import { HeatmapVisParams } from './types';

jest.mock('../../../expressions/public', () => ({
  ...(jest.requireActual('../../../expressions/public') as any),
  buildExpression: jest.fn().mockImplementation(() => ({
    toAst: () => ({
      type: 'expression',
      chain: [],
    }),
  })),
}));

jest.mock('./to_ast_esaggs', () => ({
  getEsaggsFn: jest.fn(),
}));

describe('heatmap vis toExpressionAst function', () => {
  let vis: Vis<HeatmapVisParams>;

  const params = {
    timefilter: {},
    timeRange: {},
    abortSignal: {},
  } as any;

  beforeEach(() => {
    vis = sampleAreaVis as any;
  });

  it('should match basic snapshot', () => {
    toExpressionAst(vis, params);
    const [, builtExpression] = (buildExpression as jest.Mock).mock.calls.pop()[0];

    expect(builtExpression).toMatchSnapshot();
  });
});
