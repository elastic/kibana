/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createTableVisFn } from './table_vis_fn';
import { tableVisResponseHandler } from './utils';

import { functionWrapper } from '../../expressions/common/expression_functions/specs/tests/utils';

jest.mock('./utils', () => ({
  tableVisResponseHandler: jest.fn().mockReturnValue({
    tables: [{ columns: [], rows: [] }],
  }),
}));

describe('interpreter/functions#table', () => {
  const fn = functionWrapper(createTableVisFn());
  const context = {
    type: 'datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [{ id: 'col-0-1', name: 'Count' }],
  };
  const visConfig = {
    title: 'My Chart title',
    perPage: 10,
    percentageCol: '',
    row: false,
    showToolbar: false,
    showPartialRows: false,
    splitColumn: undefined,
    splitRow: undefined,
    showMetricsAtAllLevels: false,
    sort: {
      columnIndex: null,
      direction: null,
    },
    showTotal: false,
    totalFunc: 'sum',
    metrics: [
      {
        accessor: 0,
        format: {
          id: 'number',
          params: {},
        },
        params: {},
      },
    ],
    buckets: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an object with the correct structure', async () => {
    const actual = await fn(context, visConfig, undefined);
    expect(actual).toMatchSnapshot();
  });

  it('calls response handler with correct values', async () => {
    await fn(context, visConfig, undefined);
    expect(tableVisResponseHandler).toHaveBeenCalledTimes(1);
    expect(tableVisResponseHandler).toHaveBeenCalledWith(context, visConfig);
  });
});
