/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { metricVisFunction } from './metric_vis_function';
import type { MetricArguments } from '..';
import { functionWrapper } from '@kbn/expressions-plugin/common/expression_functions/specs/tests/utils';
import { Datatable } from '@kbn/expressions-plugin/common/expression_types/specs';
import { EXPRESSION_METRIC_NAME } from '../constants';
import { ExecutionContext } from '@kbn/expressions-plugin/common';

describe('interpreter/functions#metricVis', () => {
  const fn = functionWrapper(metricVisFunction());
  const context: Datatable = {
    type: 'datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [{ id: 'col-0-1', name: 'Count', meta: { type: 'number' } }],
  };
  const args: MetricArguments = {
    metric: 'col-0-1',
    progressDirection: 'horizontal',
    maxCols: 1,
    inspectorTableId: 'random-id',
    titlesTextAlign: 'left',
    valuesTextAlign: 'right',
    iconAlign: 'left',
    valueFontSize: 'default',
  };

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
    const result = await fn(context, args, handlers);

    expect(result).toEqual({
      type: 'render',
      as: EXPRESSION_METRIC_NAME,
      value: expect.objectContaining({ overrides }),
    });
  });
});
