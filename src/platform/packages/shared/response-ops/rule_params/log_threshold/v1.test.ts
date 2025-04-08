/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { logThresholdParamsSchema } from './v1';

describe('logThresholdParamsSchema', () => {
  const base = {
    timeSize: 8,
    timeUnit: 'h',
    count: {
      value: 1,
      comparator: 'more than',
    },
    logView: {
      logViewId: 'log-view-reference-0',
      type: 'log-view-reference',
    },
    groupBy: ['geo.dest'],
  };

  const countParams = {
    ...base,
    criteria: [
      {
        field: 'bytes',
        comparator: 'more than',
        value: 1,
      },
    ],
  };

  const rationParams = {
    ...base,
    criteria: [
      [
        {
          field: 'bytes',
          comparator: 'more than',
          value: 1,
        },
      ],
    ],
  };

  const countParamsWithExcess = {
    ...countParams,
    outputIndex: '.alerts-observability.logs.alerts-default',
  };

  it('validates count params correctly', () => {
    expect(() => logThresholdParamsSchema.validate(countParams)).not.toThrow();
  });

  it('validates ration params correctly', () => {
    expect(() => logThresholdParamsSchema.validate(rationParams)).not.toThrow();
  });

  it('does not throw with excess fields', () => {
    const result = logThresholdParamsSchema.validate(countParamsWithExcess);
    expect(result).toEqual(omit(countParamsWithExcess, 'outputIndex'));
  });

  it('strips out excess fields', () => {
    const result = logThresholdParamsSchema.validate(countParams);
    expect(result).toEqual(omit(countParams, 'outputIndex'));
  });

  it.each(['criteria', 'count', 'timeUnit', 'timeSize', 'logView'])(
    'fails without %s required field',
    (field) => {
      expect(() => logThresholdParamsSchema.validate(omit(countParams, field))).toThrow();
    }
  );

  it.each(['groupBy'])('does not fail without %s optional field', (field) => {
    expect(() => logThresholdParamsSchema.validate(omit(countParams, field))).not.toThrow();
  });
});
