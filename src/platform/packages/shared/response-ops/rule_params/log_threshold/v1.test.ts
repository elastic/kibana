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

  const ratioParams = {
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

  const ratioParamsWithExcess = {
    ...ratioParams,
    outputIndex: '.alerts-observability.logs.alerts-default',
  };

  it('validates count params correctly', () => {
    expect(() => logThresholdParamsSchema.validate(countParams)).not.toThrow();
  });

  it('validates ratio params correctly', () => {
    expect(() => logThresholdParamsSchema.validate(ratioParams)).not.toThrow();
  });

  it('does not throw with excess fields in count params', () => {
    const result = logThresholdParamsSchema.validate(countParamsWithExcess);
    expect(result).toEqual(omit(countParamsWithExcess, 'outputIndex'));
  });

  it('does not throw with excess fields in ration params', () => {
    const result = logThresholdParamsSchema.validate(ratioParamsWithExcess);
    expect(result).toEqual(omit(ratioParamsWithExcess, 'outputIndex'));
  });

  it('strips out excess fields in count params', () => {
    const result = logThresholdParamsSchema.validate(countParamsWithExcess);
    expect(result).toEqual(omit(countParamsWithExcess, 'outputIndex'));
  });

  it('strips out excess fields in ratio params', () => {
    const result = logThresholdParamsSchema.validate(ratioParamsWithExcess);
    expect(result).toEqual(omit(ratioParamsWithExcess, 'outputIndex'));
  });

  it.each(['criteria', 'count', 'timeUnit', 'timeSize', 'logView'])(
    'fails without %s required field in count params',
    (field) => {
      expect(() => logThresholdParamsSchema.validate(omit(countParams, field))).toThrow();
    }
  );

  it.each(['groupBy'])('does not fail without %s optional field in count params', (field) => {
    expect(() => logThresholdParamsSchema.validate(omit(countParams, field))).not.toThrow();
  });

  it.each(['criteria', 'count', 'timeUnit', 'timeSize', 'logView'])(
    'fails without %s required field in ratio params',
    (field) => {
      expect(() => logThresholdParamsSchema.validate(omit(ratioParams, field))).toThrow();
    }
  );

  it.each(['groupBy'])('does not fail without %s optional field in ratio params', (field) => {
    expect(() => logThresholdParamsSchema.validate(omit(ratioParams, field))).not.toThrow();
  });

  it('trips out excess fields in logView', () => {
    expect(() =>
      logThresholdParamsSchema.validate({
        ...countParams,
        logView: { ...countParams.logView, excessField: 'foo' },
      })
    ).not.toThrow();
  });

  it('trips out excess fields in threshold', () => {
    expect(() =>
      logThresholdParamsSchema.validate({
        ...countParams,
        count: { ...countParams.count, excessField: 'foo' },
      })
    ).not.toThrow();
  });

  it('trips out excess fields in criteria', () => {
    expect(() =>
      logThresholdParamsSchema.validate({
        ...countParams,
        criteria: [
          {
            field: 'bytes',
            comparator: 'more than',
            value: 1,
            excessField: 'foo',
          },
        ],
      })
    ).not.toThrow();
  });
});
