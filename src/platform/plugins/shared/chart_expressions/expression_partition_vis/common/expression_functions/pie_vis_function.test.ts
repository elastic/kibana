/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { functionWrapper } from '@kbn/expressions-plugin/common/expression_functions/specs/tests/utils';
import {
  PieVisConfig,
  EmptySizeRatios,
  LabelPositions,
  ValueFormats,
  LegendDisplay,
} from '../types/expression_renderers';
import { ExpressionValueVisDimension, LegendSize } from '@kbn/visualizations-plugin/common';
import { Datatable } from '@kbn/expressions-plugin/common/expression_types/specs';
import { pieVisFunction } from './pie_vis_function';
import { PARTITION_LABELS_VALUE, PARTITION_VIS_RENDERER_NAME } from '../constants';
import { ExecutionContext } from '@kbn/expressions-plugin/common';

describe('interpreter/functions#pieVis', () => {
  const fn = functionWrapper(pieVisFunction());
  const context: Datatable = {
    type: 'datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [{ id: 'col-0-1', name: 'Count', meta: { type: 'number' } }],
  };

  const visConfig: PieVisConfig = {
    addTooltip: true,
    metricsToLabels: JSON.stringify({}),
    legendDisplay: LegendDisplay.SHOW,
    legendPosition: 'right',
    legendSize: LegendSize.SMALL,
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
      colorOverrides: {},
    },
    metrics: [
      {
        type: 'vis_dimension',
        accessor: 0,
        format: {
          id: 'number',
          params: {},
        },
      },
    ],
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
          reset: () => {},
        },
      },
      getExecutionContext: jest.fn(),
    } as unknown as ExecutionContext;

    await fn(context, visConfig, handlers as any);

    expect(loggedTable!).toMatchSnapshot();
  });

  it('should pass over overrides from variables', async () => {
    const overrides = {
      settings: {
        onBrushEnd: 'ignore',
      },
    };
    const handlers = {
      variables: { overrides },
      getExecutionContext: jest.fn(),
    } as unknown as ExecutionContext;
    const result = await fn(context, { ...visConfig, isDonut: false }, handlers);

    expect(result).toEqual({
      type: 'render',
      as: PARTITION_VIS_RENDERER_NAME,
      value: expect.objectContaining({ overrides }),
    });
  });
});
