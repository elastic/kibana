/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from '../../../expressions/common/expression_functions/specs/tests/utils';
import { createPieVisFn } from './pie_fn';
import { PieVisConfig } from './types';
import { Datatable } from '../../../expressions/common/expression_types/specs';

describe('interpreter/functions#pie', () => {
  const fn = functionWrapper(createPieVisFn());
  const context = {
    type: 'datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [{ id: 'col-0-1', name: 'Count' }],
  } as unknown as Datatable;
  const visConfig = {
    addTooltip: true,
    addLegend: true,
    legendPosition: 'right',
    isDonut: true,
    nestedLegend: true,
    truncateLegend: true,
    maxLegendLines: true,
    distinctColors: false,
    palette: 'kibana_palette',
    labels: {
      show: false,
      values: true,
      position: 'default',
      valuesFormat: 'percent',
      percentDecimals: 2,
      truncate: 100,
    },
    metric: {
      accessor: 0,
      format: {
        id: 'number',
      },
      params: {},
      aggType: 'count',
    },
  } as unknown as PieVisConfig;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an object with the correct structure', async () => {
    const actual = await fn(context, visConfig);
    expect(actual).toMatchSnapshot();
  });

  it('logs correct datatable to inspector', async () => {
    let loggedTable: Datatable;
    const handlers = {
      inspectorAdapters: {
        tables: {
          logDatatable: (name: string, datatable: Datatable) => {
            loggedTable = datatable;
          },
        },
      },
    };
    await fn(context, visConfig, handlers as any);

    expect(loggedTable!).toMatchSnapshot();
  });
});
