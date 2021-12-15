/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { gaugeFunction } from './gauge_function';
import type { GaugeArguments } from '..';
import { functionWrapper } from '../../../../expressions/common/expression_functions/specs/tests/utils';
import { Datatable } from '../../../../expressions/common/expression_types/specs';

describe('interpreter/functions#gauge', () => {
  const fn = functionWrapper(gaugeFunction());
  const context: Datatable = {
    type: 'datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [
      { id: 'col-0-1', name: 'Count', meta: { type: 'number' } },
      { id: 'col-1-2', name: 'Dest', meta: { type: 'string' } },
    ],
  };
  const args: GaugeArguments = {
    ticksPosition: 'auto',
    labelMajorMode: 'custom',
    labelMajor: 'title',
    shape: 'horizontalBullet',
    colorMode: 'none',
    minAccessor: 'col-1-2',
    metricAccessor: 'col-0-1',
  };

  it('returns an object with the correct structure', () => {
    const actual = fn(context, args, undefined);
    expect(actual).toMatchSnapshot();
  });
});
