/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorMode, ColorSchemas } from '@kbn/charts-plugin/public';
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
      data: {},
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

  it('should pass color mode if color ranges are set', async () => {
    vis.params = {
      metric: {
        metricColorMode: ColorMode.Background,
        colorSchema: ColorSchemas.Greens,
        colorsRange: [
          {
            type: 'range',
            from: 0,
            to: 1,
          },
          {
            type: 'range',
            from: 1,
            to: 2,
          },
        ],
      },
    } as VisParams;
    const actual = await toExpressionAst(vis, {
      timefilter: {} as TimefilterContract,
    });
    expect(actual.chain[0].arguments.colorMode).toEqual([ColorMode.Background]);
  });

  it('should not pass color mode if there is just a single range, but still pass palette for percentage mode', async () => {
    vis.params = {
      metric: {
        metricColorMode: ColorMode.Background,
        colorSchema: ColorSchemas.Greens,
        colorsRange: [
          {
            type: 'range',
            from: 0,
            to: 1,
          },
        ],
      },
    } as VisParams;
    const actual = await toExpressionAst(vis, {
      timefilter: {} as TimefilterContract,
    });
    expect(actual.chain[0].arguments.colorMode).toEqual([ColorMode.None]);
    expect(actual.chain[0].arguments.palette.length).toEqual(1);
  });
});
