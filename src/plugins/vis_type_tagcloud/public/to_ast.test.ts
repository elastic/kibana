/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Vis } from 'src/plugins/visualizations/public';
import { toExpressionAst } from './to_ast';
import { TagCloudVisParams } from './types';

const mockSchemas = {
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

jest.mock('../../visualizations/public', () => ({
  getVisSchemas: () => mockSchemas,
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
    } as any;
  });

  it('should match snapshot without params', () => {
    const actual = toExpressionAst(vis, {} as any);
    expect(actual).toMatchSnapshot();
  });

  it('should match snapshot params fulfilled', () => {
    vis.params = {
      scale: 'linear',
      orientation: 'single',
      minFontSize: 5,
      maxFontSize: 15,
      showLabel: true,
    };
    const actual = toExpressionAst(vis, {} as any);
    expect(actual).toMatchSnapshot();
  });
});
