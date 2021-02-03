/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { functionWrapper } from '../../expressions/common/expression_functions/specs/tests/utils';
import { createRegionMapFn } from './region_map_fn';

describe('interpreter/functions#regionmap', () => {
  const fn = functionWrapper(createRegionMapFn());
  const context = {
    type: 'datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [{ id: 'col-0-1', name: 'Count' }],
  };
  const visConfig = {
    legendPosition: 'bottomright',
    addTooltip: true,
    colorSchema: 'Yellow to Red',
    emsHotLink: '',
    selectedJoinField: null,
    isDisplayWarning: true,
    wms: {
      enabled: false,
      options: {
        format: 'image/png',
        transparent: true,
      },
    },
    mapZoom: 2,
    mapCenter: [0, 0],
    outlineWeight: 1,
    showAllShapes: true,
    metric: {
      accessor: 0,
      format: {
        id: 'number',
      },
      params: {},
      aggType: 'count',
    },
  };

  it('returns an object with the correct structure', () => {
    const actual = fn(context, { visConfig: JSON.stringify(visConfig) });
    expect(actual).toMatchSnapshot();
  });
});
