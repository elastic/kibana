/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createMetricVisFn } from './metric_vis_fn';
import { functionWrapper } from '../../../expressions/common/expression_functions/specs/tests/utils';
import { Datatable } from '../../../expressions/common/expression_types/specs';

type Arguments = Parameters<ReturnType<typeof createMetricVisFn>['fn']>[1];

describe('interpreter/functions#metric', () => {
  const fn = functionWrapper(createMetricVisFn());
  const context = {
    type: 'datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [{ id: 'col-0-1', name: 'Count' }],
  } as unknown as Datatable;
  const args = {
    percentageMode: false,
    useRanges: false,
    colorSchema: 'Green to Red',
    metricColorMode: 'None',
    colorsRange: [
      {
        from: 0,
        to: 10000,
      },
    ],
    labels: {
      show: true,
    },
    invertColors: false,
    style: {
      bgFill: '#000',
      bgColor: false,
      labelColor: false,
      subText: '',
      fontSize: 60,
    },
    font: { spec: { fontSize: 60 } },
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
  } as unknown as Arguments;

  it('returns an object with the correct structure', () => {
    const actual = fn(context, args, undefined);

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
    await fn(context, args, handlers as any);

    expect(loggedTable!).toMatchSnapshot();
  });
});
