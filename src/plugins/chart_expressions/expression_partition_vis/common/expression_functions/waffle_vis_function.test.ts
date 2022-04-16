/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from '@kbn/expressions-plugin/common/expression_functions/specs/tests/utils';
import {
  WaffleVisConfig,
  LabelPositions,
  ValueFormats,
  LegendDisplay,
} from '../types/expression_renderers';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { Datatable } from '@kbn/expressions-plugin/common/expression_types/specs';
import { waffleVisFunction } from './waffle_vis_function';
import { PARTITION_LABELS_VALUE } from '../constants';

describe('interpreter/functions#waffleVis', () => {
  const fn = functionWrapper(waffleVisFunction());
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

  const visConfig: WaffleVisConfig = {
    addTooltip: true,
    showValuesInLegend: true,
    legendDisplay: LegendDisplay.SHOW,
    legendPosition: 'right',
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
    },
    metric: {
      type: 'vis_dimension',
      accessor: 0,
      format: {
        id: 'number',
        params: {},
      },
    },
    bucket: {
      type: 'vis_dimension',
      accessor: 1,
      format: {
        id: 'number',
        params: {},
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an object with the correct structure', async () => {
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
