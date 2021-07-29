/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createTagCloudFn } from './tag_cloud_fn';

import { functionWrapper } from '../../expressions/common/expression_functions/specs/tests/utils';
import { ExpressionValueVisDimension } from '../../visualizations/public';

describe('interpreter/functions#tagcloud', () => {
  const fn = functionWrapper(createTagCloudFn());
  const column1 = 'Count';
  const column2 = 'country';

  const context = {
    type: 'datatable',
    columns: [
      { id: column1, name: column1 },
      { id: column2, name: column2 },
    ],
    rows: [
      { [column1]: 0, [column2]: 'US' },
      { [column1]: 10, [column2]: 'UK' },
    ],
  };
  const visConfig = {
    scale: 'linear',
    orientation: 'single',
    minFontSize: 18,
    maxFontSize: 72,
    showLabel: true,
  };

  const numberAccessors = {
    metric: { accessor: 0 },
    bucket: { accessor: 1 },
  };

  const stringAccessors: {
    metric: ExpressionValueVisDimension;
    bucket: ExpressionValueVisDimension;
  } = {
    metric: {
      type: 'vis_dimension',
      accessor: {
        id: column1,
        name: column1,
        meta: {
          type: 'number',
        },
      },
      format: {
        params: {},
      },
    },
    bucket: {
      type: 'vis_dimension',
      accessor: {
        id: column2,
        name: column2,
        meta: {
          type: 'string',
        },
      },
      format: {
        params: {},
      },
    },
  };

  it('returns an object with the correct structure for number accessors', () => {
    const actual = fn(context, { ...visConfig, ...numberAccessors }, undefined);
    expect(actual).toMatchSnapshot();
  });

  it('returns an object with the correct structure for string accessors', () => {
    const actual = fn(context, { ...visConfig, ...stringAccessors }, undefined);
    expect(actual).toMatchSnapshot();
  });
});
