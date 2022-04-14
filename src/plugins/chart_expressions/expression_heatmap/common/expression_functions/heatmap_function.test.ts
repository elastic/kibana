/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { heatmapFunction } from './heatmap_function';
import type { HeatmapArguments } from '../../common';
import { functionWrapper } from '../../../../expressions/common/expression_functions/specs/tests/utils';
import { Datatable } from '../../../../expressions/common/expression_types/specs';
import { EXPRESSION_HEATMAP_GRID_NAME, EXPRESSION_HEATMAP_LEGEND_NAME } from '../constants';

describe('interpreter/functions#heatmap', () => {
  const fn = functionWrapper(heatmapFunction());
  const context: Datatable = {
    type: 'datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [
      { id: 'col-0-1', name: 'Count', meta: { type: 'number' } },
      { id: 'col-1-2', name: 'Dest', meta: { type: 'string' } },
    ],
  };
  const args: HeatmapArguments = {
    percentageMode: false,
    legend: {
      isVisible: true,
      position: 'top',
      legendSize: 80,
      type: EXPRESSION_HEATMAP_LEGEND_NAME,
    },
    gridConfig: {
      isCellLabelVisible: true,
      isYAxisLabelVisible: true,
      isXAxisLabelVisible: true,
      isYAxisTitleVisible: true,
      isXAxisTitleVisible: true,
      type: EXPRESSION_HEATMAP_GRID_NAME,
    },
    palette: {
      type: 'palette',
      name: '',
      params: {
        colors: ['rgb(0, 0, 0, 0)', 'rgb(112, 38, 231)'],
        stops: [0, 10000],
        gradient: false,
        rangeMin: 0,
        rangeMax: 150,
        range: 'number',
      },
    },
    showTooltip: true,
    highlightInHover: false,
    xAccessor: 'col-1-2',
    valueAccessor: 'col-0-1',
  };

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
