/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createTagCloudFn } from './tag_cloud_fn';

import { functionWrapper } from '../../expressions/common/expression_functions/specs/tests/utils';

describe('interpreter/functions#tagcloud', () => {
  const fn = functionWrapper(createTagCloudFn());
  const context = {
    type: 'datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [{ id: 'col-0-1', name: 'Count' }],
  };
  const visConfig = {
    scale: 'linear',
    orientation: 'single',
    minFontSize: 18,
    maxFontSize: 72,
    showLabel: true,
    metric: { accessor: 0, format: { id: 'number' } },
  };

  it('returns an object with the correct structure', () => {
    const actual = fn(context, visConfig, undefined);
    expect(actual).toMatchSnapshot();
  });
});
