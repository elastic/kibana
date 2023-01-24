/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from '@kbn/expressions-plugin/common/expression_functions/specs/tests/utils';
import {
  MosaicVisConfig,
  LabelPositions,
  ValueFormats,
  LegendDisplay,
} from '../types/expression_renderers';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { Datatable } from '@kbn/expressions-plugin/common/expression_types/specs';
import { mosaicVisFunction } from './mosaic_vis_function';
import { PARTITION_LABELS_VALUE } from '../constants';
import { ExecutionContext } from '@kbn/expressions-plugin/common';

describe('interpreter/functions#mosaicVis', () => {
  const fn = functionWrapper(mosaicVisFunction());
  const context: Datatable = {
    type: 'datatable',
    rows: [{ 'col-0-1': 0, 'col-0-2': 0, 'col-0-3': 0, 'col-0-4': 0 }],
    columns: [
      { id: 'col-0-1', name: 'Field 1', meta: { type: 'number' } },
      { id: 'col-0-2', name: 'Field 2', meta: { type: 'number' } },
      { id: 'col-0-3', name: 'Field 3', meta: { type: 'number' } },
      { id: 'col-0-4', name: 'Field 4', meta: { type: 'number' } },
    ],
  };

  const visConfig: MosaicVisConfig = {
    addTooltip: true,
    legendDisplay: LegendDisplay.SHOW,
    legendPosition: 'right',
    nestedLegend: true,
    truncateLegend: true,
    maxLegendLines: 2,
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
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an object with the correct structure', async () => {
    const actual = await fn(context, visConfig);
    expect(actual).toMatchSnapshot();
  });

  it('throws error if provided more than 2 buckets', async () => {
    expect(() =>
      fn(context, {
        ...visConfig,
        buckets: [
          ...(visConfig.buckets ?? []),
          {
            type: 'vis_dimension',
            accessor: 3,
            format: {
              id: 'number',
              params: {},
            },
          },
        ],
      })
    ).toThrowErrorMatchingSnapshot();
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

    await fn(context, visConfig, handlers);

    expect(loggedTable!).toMatchSnapshot();
  });
});
