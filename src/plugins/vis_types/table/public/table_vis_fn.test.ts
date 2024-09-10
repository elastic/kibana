/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createTableVisFn } from './table_vis_fn';
import { tableVisResponseHandler } from './utils';
import { TableVisConfig } from './types';

import { ExecutionContext } from '@kbn/expressions-plugin/common';
import { functionWrapper } from '@kbn/expressions-plugin/common/expression_functions/specs/tests/utils';
import { Datatable } from '@kbn/expressions-plugin/common/expression_types/specs';

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
  } as unknown as Datatable;
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
    autoFitRowToContent: false,
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
  } as unknown as TableVisConfig;
  const handlers = {
    variables: {},
  } as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an object with the correct structure', async () => {
    const actual = await fn(context, visConfig, handlers);
    expect(actual).toMatchSnapshot();
  });

  it('calls response handler with correct values', async () => {
    await fn(context, visConfig, handlers);
    expect(tableVisResponseHandler).toHaveBeenCalledTimes(1);
    expect(tableVisResponseHandler).toHaveBeenCalledWith(context, visConfig);
  });

  it('logs correct datatable to inspector', async () => {
    let loggedTable: Datatable;
    await fn(context, visConfig, {
      ...handlers,
      inspectorAdapters: {
        tables: {
          logDatatable: (name: string, datatable: Datatable) => {
            loggedTable = datatable;
          },
          reset: () => {},
        },
      },
    });

    expect(loggedTable!).toMatchSnapshot();
  });
});
