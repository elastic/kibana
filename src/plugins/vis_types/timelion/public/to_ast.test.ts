/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Vis } from '@kbn/visualizations-plugin/public';
import { TimelionVisParams } from './timelion_vis_fn';
import { toExpressionAst } from './to_ast';

describe('timelion vis toExpressionAst function', () => {
  let vis: Vis<TimelionVisParams>;

  beforeEach(() => {
    vis = {
      params: {
        expression: '.es(*)',
        interval: 'auto',
      },
    } as any;
  });

  it('should match basic snapshot', () => {
    const actual = toExpressionAst(vis);
    expect(actual).toMatchSnapshot();
  });

  it('should not escape single quotes', () => {
    vis.params.expression = `.es(index=my*,timefield="date",split='test field:3',metric='avg:value')`;
    const actual = toExpressionAst(vis);
    expect(actual).toMatchSnapshot();
  });
});
