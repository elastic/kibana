/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Position } from '@elastic/charts';
import type { AxisFormatPolicy } from './axis_format_policy_types';
import {
  getDataMemberFactor,
  toCoordinateUnitValue,
  toSourceUnitValue,
} from './axis_unit_conversion';

const policies: AxisFormatPolicy[] = [
  {
    groupId: 'left',
    position: Position.Left,
    formatter: {
      id: 'duration',
      params: { inputFormat: 'seconds', outputFormat: 'humanizePrecise' },
    },
    coordinateUnit: 'seconds',
    members: [
      {
        layerId: 'first',
        accessor: 'milliseconds',
        factor: 0.001,
        format: {
          id: 'duration',
          params: { inputFormat: 'milliseconds', outputFormat: 'humanizePrecise' },
        },
        kind: 'data',
      },
    ],
    mismatches: [],
  },
];

describe('axis unit conversion', () => {
  it('converts source units into the coordinate unit and back', () => {
    const factor = getDataMemberFactor(policies, 'first', 'milliseconds');
    expect(toCoordinateUnitValue(1000, factor)).toBe(1);
    expect(toSourceUnitValue(1, factor)).toBe(1000);
  });

  it('leaves values unchanged when the factor is 1', () => {
    expect(toCoordinateUnitValue(12, 1)).toBe(12);
    expect(toSourceUnitValue(12, 1)).toBe(12);
    expect(getDataMemberFactor(policies, 'first', 'other')).toBe(1);
    expect(getDataMemberFactor(undefined, 'first', 'milliseconds')).toBe(1);
  });
});
