/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Vis } from '@kbn/visualizations-plugin/public';
import { buildExpression } from '@kbn/expressions-plugin/public';

import { PieVisParams } from './pie';
import { samplePieVis } from '@kbn/vis-type-pie-plugin/public/sample_vis.test.mocks';
import { toExpressionAst } from './to_ast_pie';

jest.mock('@kbn/expressions-plugin/public', () => ({
  ...(jest.requireActual('@kbn/expressions-plugin/public') as any),
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

describe('vislib pie vis toExpressionAst function', () => {
  let vis: Vis<PieVisParams>;

  const params = {
    timefilter: {},
    timeRange: {},
    abortSignal: {},
  } as any;

  beforeEach(() => {
    vis = samplePieVis as any;
  });

  it('should match basic snapshot', () => {
    toExpressionAst(vis, params);
    const [, builtExpression] = (buildExpression as jest.Mock).mock.calls[0][0];

    expect(builtExpression).toMatchSnapshot();
  });
});
