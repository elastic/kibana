/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Vis } from '../../visualizations/public';
import { buildExpression } from '../../expressions/public';

import { BasicVislibParams } from './types';
import { toExpressionAst } from './to_ast';
import { sampleAreaVis } from '../../vis_type_xy/public/sample_vis.test.mocks';

jest.mock('../../expressions/public', () => ({
  ...(jest.requireActual('../../expressions/public') as any),
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

describe('vislib vis toExpressionAst function', () => {
  let vis: Vis<BasicVislibParams>;

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
    const [, builtExpression] = (buildExpression as jest.Mock).mock.calls[0][0];

    expect(builtExpression).toMatchSnapshot();
  });
});
