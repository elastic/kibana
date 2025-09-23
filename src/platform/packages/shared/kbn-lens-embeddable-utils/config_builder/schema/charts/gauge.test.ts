/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../../transforms/columns/utils';
import { gaugeStateSchema } from './gauge';

describe('Gauge Schema', () => {
  const baseGaugeConfig = {
    type: 'gauge' as const,
    dataset: {
      type: 'dataView' as const,
      name: 'test-data-view',
    },
  };

  const defaultValues = {
    sampling: 1,
    ignore_global_filters: false,
  };

  it('validates minimal configuration', () => {
    const input = {
      ...baseGaugeConfig,
      metric: {
        operation: 'count' as const,
        field: 'test_field',
        empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
      },
    };

    const validated = gaugeStateSchema.validate(input);
    expect(validated).toEqual({ ...defaultValues, ...input });
  });

  it('validates full configuration with bullet shape', () => {
    const input = {
      ...baseGaugeConfig,
      title: 'Performance Gauge',
      metric: {
        operation: 'sum' as const,
        field: 'performance_score',
        empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        sub_label: 'Score',
        color: {
          type: 'dynamic' as const,
          min: 0,
          max: 100,
          range: 'absolute' as const,
          steps: [
            { type: 'from' as const, from: 0, color: '#red' },
            { type: 'to' as const, to: 100, color: '#green' },
          ],
        },
        thicks: 'bands' as const,
        min: {
          operation: 'static_value' as const,
          value: 0,
        },
        max: {
          operation: 'static_value' as const,
          value: 100,
        },
        goal: {
          operation: 'static_value' as const,
          value: 80,
        },
      },
      shape: {
        type: 'bullet' as const,
        direction: 'vertical' as const,
      },
    };

    const validated = gaugeStateSchema.validate(input);
    expect(validated).toEqual({ ...defaultValues, ...input });
  });

  it('validates circular gauge configuration', () => {
    const input = {
      ...baseGaugeConfig,
      metric: {
        operation: 'average' as const,
        field: 'cpu_usage',
        thicks: 'auto' as const,
      },
      shape: {
        type: 'circle' as const,
      },
    };

    const validated = gaugeStateSchema.validate(input);
    expect(validated).toEqual({ ...defaultValues, ...input });
  });

  it('validates default values are applied', () => {
    const input = {
      ...baseGaugeConfig,
      metric: {
        operation: 'count' as const,
        field: 'test_field',
        empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
      },
      shape: {
        type: 'bullet' as const,
      },
    };

    const validated = gaugeStateSchema.validate(input);
    expect(validated.shape).toEqual({
      type: 'bullet',
      direction: 'horizontal',
    });
    // thicks default is only applied when explicitly set, not when omitted
    expect(validated.metric.thicks).toBeUndefined();
  });

  it('validates ESQL configuration', () => {
    const input = {
      type: 'gauge' as const,
      dataset: {
        type: 'esql' as const,
        query: 'FROM my-index | LIMIT 100',
      },
      metric: {
        operation: 'value',
        column: 'score' as const,
        sub_label: 'Performance',
      },
    };

    const validated = gaugeStateSchema.validate(input);
    expect(validated).toEqual({ ...defaultValues, ...input });
  });

  it('throws on invalid shape type', () => {
    const input = {
      ...baseGaugeConfig,
      metric: {
        operation: 'count' as const,
        field: 'test_field',
      },
      shape: {
        type: 'invalid' as const,
      },
    };

    expect(() => gaugeStateSchema.validate(input)).toThrow();
  });

  it('throws on invalid thicks value', () => {
    const input = {
      ...baseGaugeConfig,
      metric: {
        operation: 'count' as const,
        field: 'test_field',
        thicks: 'invalid' as const,
      },
    };

    expect(() => gaugeStateSchema.validate(input)).toThrow();
  });
});