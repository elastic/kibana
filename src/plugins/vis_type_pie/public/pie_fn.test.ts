/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from '../../expressions/common/expression_functions/specs/tests/utils';
import { createPieVisFn } from './pie_fn';

describe('interpreter/functions#pie', () => {
  const fn = functionWrapper(createPieVisFn());
  const context = {
    type: 'datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [{ id: 'col-0-1', name: 'Count' }],
  };
  const visConfig = {
    type: 'pie',
    addTooltip: true,
    addLegend: true,
    legendPosition: 'right',
    isDonut: true,
    nestedLegend: true,
    palette: 'kibana_palette',
    labels: {
      show: false,
      values: true,
      last_level: true,
      position: 'default',
      valuesFormat: 'percent',
      truncate: 100,
    },
    dimensions: {
      metric: {
        accessor: 0,
        format: {
          id: 'number',
        },
        params: {},
        aggType: 'count',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an object with the correct structure', async () => {
    const actual = await fn(context, { visConfig: JSON.stringify(visConfig) });
    expect(actual).toMatchSnapshot();
  });
});
