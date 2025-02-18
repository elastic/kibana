/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Vis } from '@kbn/visualizations-plugin/public';
import { buildExpression } from '@kbn/expressions-plugin/public';

import { BasicVislibParams } from './types';
import { toExpressionAst } from './to_ast';
import { sampleAreaVis } from '@kbn/vis-type-xy-plugin/public/sample_vis.test.mocks';

jest.mock('@kbn/expressions-plugin/public', () => ({
  ...(jest.requireActual('@kbn/expressions-plugin/public') as any),
  buildExpression: jest.fn().mockImplementation(() => ({
    toAst: () => ({
      type: 'expression',
      chain: [],
    }),
  })),
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
    const [builtExpression] = (buildExpression as jest.Mock).mock.calls[0][0];

    expect(builtExpression).toMatchSnapshot();
  });
});
