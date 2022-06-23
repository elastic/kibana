/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Datatable } from '@kbn/expressions-plugin';
import { functionWrapper } from '@kbn/expressions-plugin/common/expression_functions/specs/tests/utils';
import { createPieVisFn } from './pie_fn';
// @ts-ignore
import { vislibSlicesResponseHandler } from './vislib/response_handler';

jest.mock('./vislib/response_handler', () => ({
  vislibSlicesResponseHandler: jest.fn().mockReturnValue({
    hits: 1,
    names: ['Count'],
    raw: {
      columns: [],
      rows: [],
    },
    slices: {
      children: [],
    },
    tooltipFormatter: {
      id: 'number',
    },
  }),
}));

describe('interpreter/functions#pie', () => {
  const fn = functionWrapper(createPieVisFn());
  const context = {
    type: 'datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [{ id: 'col-0-1', name: 'Count' }],
  } as unknown as Datatable;
  const visConfig = {
    type: 'pie',
    addTooltip: true,
    legendDisplay: 'show',
    legendPosition: 'right',
    isDonut: true,
    labels: {
      show: false,
      values: true,
      last_level: true,
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

  it('calls response handler with correct values', async () => {
    await fn(context, { visConfig: JSON.stringify(visConfig) });
    expect(vislibSlicesResponseHandler).toHaveBeenCalledTimes(1);
    expect(vislibSlicesResponseHandler).toHaveBeenCalledWith(context, visConfig.dimensions);
  });
});
