/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createTableVisLegacyFn } from './table_vis_legacy_fn';
import { tableVisLegacyResponseHandler } from './table_vis_legacy_response_handler';

import { functionWrapper } from '../../../expressions/common/expression_functions/specs/tests/utils';

jest.mock('./table_vis_legacy_response_handler', () => ({
  tableVisLegacyResponseHandler: jest.fn().mockReturnValue({
    tables: [{ columns: [], rows: [] }],
  }),
}));

describe('interpreter/functions#table', () => {
  const fn = functionWrapper(createTableVisLegacyFn());
  const context = {
    type: 'datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [{ id: 'col-0-1', name: 'Count' }],
  };
  const visConfig = {
    title: 'My Chart title',
    perPage: 10,
    showPartialRows: false,
    showMetricsAtAllLevels: false,
    sort: {
      columnIndex: null,
      direction: null,
    },
    showTotal: false,
    totalFunc: 'sum',
    dimensions: {
      metrics: [
        {
          accessor: 0,
          format: {
            id: 'number',
          },
          params: {},
          aggType: 'count',
        },
      ],
      buckets: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an object with the correct structure', async () => {
    const actual = await fn(context, { visConfig: JSON.stringify(visConfig) }, undefined);
    expect(actual).toMatchSnapshot();
  });

  it('calls response handler with correct values', async () => {
    await fn(context, { visConfig: JSON.stringify(visConfig) }, undefined);
    expect(tableVisLegacyResponseHandler).toHaveBeenCalledTimes(1);
    expect(tableVisLegacyResponseHandler).toHaveBeenCalledWith(context, visConfig.dimensions);
  });
});
