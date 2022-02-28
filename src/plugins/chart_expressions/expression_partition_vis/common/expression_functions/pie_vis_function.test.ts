/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from '../../../../expressions/common/expression_functions/specs/tests/utils';
import {
  PieVisConfig,
  EmptySizeRatios,
  LabelPositions,
  ValueFormats,
  LegendDisplay,
} from '../types/expression_renderers';
import { ExpressionValueVisDimension } from '../../../../visualizations/common';
import { Datatable } from '../../../../expressions/common/expression_types/specs';
import { pieVisFunction } from './pie_vis_function';
import { PARTITION_LABELS_VALUE } from '../constants';

describe('interpreter/functions#pieVis', () => {
  const fn = functionWrapper(pieVisFunction());
  const context: Datatable = {
    type: 'datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [{ id: 'col-0-1', name: 'Count', meta: { type: 'number' } }],
  };

  const visConfig: PieVisConfig = {
    addTooltip: true,
    legendDisplay: LegendDisplay.SHOW,
    legendPosition: 'right',
    isDonut: true,
    emptySizeRatio: EmptySizeRatios.SMALL,
    nestedLegend: true,
    truncateLegend: true,
    maxLegendLines: 2,
    distinctColors: false,
    palette: {
      type: 'system_palette',
      name: 'kibana_palette',
    },
    labels: {
      type: PARTITION_LABELS_VALUE,
      show: false,
      values: true,
      position: LabelPositions.DEFAULT,
      valuesFormat: ValueFormats.PERCENT,
      percentDecimals: 2,
      truncate: 100,
      last_level: false,
    },
    metric: {
      type: 'vis_dimension',
      accessor: 0,
      format: {
        id: 'number',
        params: {},
      },
    },
    buckets: [
      {
        type: 'vis_dimension',
        accessor: 1,
        format: {
          id: 'number',
          params: {},
        },
      },
      {
        type: 'vis_dimension',
        accessor: 2,
        format: {
          id: 'number',
          params: {},
        },
      },
      {
        type: 'vis_dimension',
        accessor: 3,
        format: {
          id: 'number',
          params: {},
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an object with the correct structure for pie', async () => {
    const actual = await fn(context, { ...visConfig, isDonut: false });
    expect(actual).toMatchSnapshot();
  });

  it('returns an object with the correct structure for donut', async () => {
    const actual = await fn(context, visConfig);
    expect(actual).toMatchSnapshot();
  });

  it('throws error if provided split row and split column at once', async () => {
    const splitDimension: ExpressionValueVisDimension = {
      type: 'vis_dimension',
      accessor: 3,
      format: {
        id: 'number',
        params: {},
      },
    };

    expect(() =>
      fn(context, {
        ...visConfig,
        splitColumn: [splitDimension],
        splitRow: [splitDimension],
      })
    ).toThrowErrorMatchingSnapshot();
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
