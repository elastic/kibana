/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Vis, VisToExpressionAstParams } from '@kbn/visualizations-plugin/public';
import { toExpressionAst } from './to_ast';
import { TagCloudVisParams } from './types';

const mockedSchemas = {
  metric: [{ accessor: 1, format: { id: 'number' }, params: {}, label: 'Count', aggType: 'count' }],
  segment: [
    {
      accessor: 0,
      format: {
        id: 'terms',
        params: {
          id: 'string',
          otherBucketLabel: 'Other',
          missingBucketLabel: 'Missing',
        },
      },
      params: {},
      label: 'products.product_name.keyword: Descending',
      aggType: 'terms',
    },
  ],
};

jest.mock('@kbn/visualizations-plugin/public', () => ({
  getVisSchemas: () => mockedSchemas,
}));

describe('tagcloud vis toExpressionAst function', () => {
  let vis: Vis<TagCloudVisParams>;

  beforeEach(() => {
    vis = {
      isHierarchical: () => false,
      type: {},
      params: {
        showLabel: false,
      },
      data: {
        indexPattern: { id: '123' },
        aggs: {
          getResponseAggs: () => [],
          aggs: [],
        },
      },
    } as unknown as Vis<TagCloudVisParams>;
  });

  it('should match snapshot without params', () => {
    const actual = toExpressionAst(vis, {} as VisToExpressionAstParams);
    expect(actual).toMatchSnapshot();
  });

  it('should match snapshot params fulfilled with number vis_dimension.accessor at metric', () => {
    vis.params = {
      scale: 'linear',
      orientation: 'single',
      minFontSize: 5,
      maxFontSize: 15,
      showLabel: true,
      palette: {
        type: 'palette',
        name: 'default',
      },
      metric: {
        type: 'vis_dimension',
        accessor: 0,
        format: {
          id: 'number',
          params: {
            id: 'number',
          },
        },
      },
    };
    const actual = toExpressionAst(vis, {} as VisToExpressionAstParams);
    expect(actual).toMatchSnapshot();
  });

  it('should match snapshot params fulfilled with DatatableColumn vis_dimension.accessor at metric', () => {
    vis.params = {
      scale: 'linear',
      orientation: 'single',
      minFontSize: 5,
      maxFontSize: 15,
      showLabel: true,
      palette: {
        type: 'palette',
        name: 'default',
      },
      metric: {
        type: 'vis_dimension',
        accessor: {
          id: 'count',
          name: 'count',
          meta: { type: 'number' },
        },
        format: {
          id: 'number',
          params: {
            id: 'number',
          },
        },
      },
    };
    const actual = toExpressionAst(vis, {} as VisToExpressionAstParams);
    expect(actual).toMatchSnapshot();
  });
});
