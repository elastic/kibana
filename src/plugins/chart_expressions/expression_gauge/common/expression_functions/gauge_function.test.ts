/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { gaugeFunction } from './gauge_function';
import { GaugeArguments, GaugeShapes } from '..';
import { functionWrapper } from '../../../../expressions/common/expression_functions/specs/tests/utils';
import { Datatable } from '../../../../expressions/common/expression_types/specs';
import { GaugeColorModes, GaugeLabelMajorModes, GaugeTicksPositions } from '../constants';

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
    ticksPosition: GaugeTicksPositions.AUTO,
    labelMajorMode: GaugeLabelMajorModes.CUSTOM,
    labelMajor: 'title',
    shape: GaugeShapes.HORIZONTAL_BULLET,
    colorMode: GaugeColorModes.NONE,
    minAccessor: 'col-1-2',
    metricAccessor: 'col-0-1',
  };

  it('returns an object with the correct structure', () => {
    const actual = fn(context, args, undefined);
    expect(actual).toMatchSnapshot();
  });
});
