/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../../transforms/columns/utils';
import type { ColorByValueType } from '../color';
import type { GaugeState } from './gauge';
import { gaugeStateSchema } from './gauge';

describe('Gauge Schema', () => {
  const baseGaugeConfig = {
    type: 'gauge' as const,
    dataset: {
      type: 'dataView' as const,
      id: 'test-data-view',
    },
  } satisfies Partial<GaugeState>;

  const defaultValues = {
    sampling: 1,
    ignore_global_filters: false,
  } satisfies Partial<GaugeState>;

  type GaugeInput = Omit<GaugeState, keyof typeof defaultValues>;

  it('validates minimal configuration', () => {
    const input = {
      ...baseGaugeConfig,
      metric: {
        operation: 'count' as const,
        field: 'test_field',
        empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
      },
    } satisfies GaugeInput;

    const validated = gaugeStateSchema.validate(input);
    expect(validated).toEqual({ ...defaultValues, ...input });
  });

  it('validates full configuration with bullet shape', () => {
    const colorByValueConfig: ColorByValueType[] = [
      {
        type: 'dynamic',
        range: 'absolute',
        steps: [
          { lt: 0, color: 'blue' },
          { gte: 100, color: 'red' },
        ],
      },
      {
        type: 'dynamic',
        range: 'percentage',
        steps: [
          { lt: 0, color: 'blue' },
          { gte: 100, color: 'red' },
        ],
      },
    ];

    for (const color of colorByValueConfig) {
      const input = {
        ...baseGaugeConfig,
        title: 'Performance Gauge',
        metric: {
          operation: 'sum' as const,
          field: 'performance_score',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          title: 'Score',
          sub_title: 'with 80% target',
          color,
          ticks: 'bands' as const,
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
      } satisfies GaugeInput;

      const validated = gaugeStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    }
  });

  it('validates circular gauge configuration', () => {
    const input = {
      ...baseGaugeConfig,
      metric: {
        operation: 'average' as const,
        field: 'cpu_usage',
        ticks: 'auto' as const,
      },
      shape: {
        type: 'circle' as const,
      },
    } satisfies GaugeInput;

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
        direction: 'horizontal' as const,
      },
    } satisfies GaugeInput;

    const validated = gaugeStateSchema.validate(input);
    expect(validated.shape).toEqual({
      type: 'bullet',
      direction: 'horizontal',
    });
    // ticks default is only applied when explicitly set, not when omitted
    expect(validated.metric.ticks).toBeUndefined();
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
        sub_title: 'Performance',
      },
    } satisfies GaugeInput;

    const validated = gaugeStateSchema.validate(input);
    expect(validated).toEqual({ ...defaultValues, ...input });
  });

  it('validates ES|QL full configuration with bullet shape', () => {
    const input = {
      type: 'gauge' as const,
      dataset: {
        type: 'esql' as const,
        query: 'FROM my-index | LIMIT 100',
      },
      title: 'Performance Gauge',
      metric: {
        operation: 'value' as const,
        column: 'score',
        title: 'Score',
        sub_title: 'with 80% target',
        color: {
          type: 'dynamic',
          range: 'absolute',
          steps: [
            { lt: 0, color: 'blue' },
            { gte: 100, color: 'red' },
          ],
        },
        ticks: 'bands' as const,
        min: {
          operation: 'value' as const,
          column: 'min',
        },
        max: {
          operation: 'value' as const,
          column: 'max',
        },
        goal: {
          operation: 'value' as const,
          column: 'goal',
        },
      },
      shape: {
        type: 'bullet' as const,
        direction: 'vertical' as const,
      },
    } satisfies GaugeInput;

    const validated = gaugeStateSchema.validate(input);
    expect(validated).toEqual({ ...defaultValues, ...input });
  });

  it('throws on mixed DSL and ES|QL configs', () => {
    const input = {
      type: 'gauge' as const,
      dataset: {
        type: 'esql' as const,
        query: 'FROM my-index | LIMIT 100',
      },
      title: 'Performance Gauge',
      metric: {
        operation: 'value' as const,
        column: 'score',
        min: {
          // @ts-expect-error
          operation: 'static' as const,
          value: 5,
        },
      },
      shape: {
        type: 'bullet' as const,
        direction: 'vertical' as const,
      },
    } satisfies GaugeInput;

    expect(() => gaugeStateSchema.validate(input)).toThrow();
  });

  it('throws on invalid operations as metric', () => {
    const invalidOps = [
      { operation: 'static', value: 5 },
      { operation: 'moving_average', window: 5, field: 'bytes' },
    ];
    for (const op of invalidOps) {
      expect(() => gaugeStateSchema.validate({ ...baseGaugeConfig, metric: op })).toThrow();
    }
  });

  it('throws on invalid shape type', () => {
    const input = {
      ...baseGaugeConfig,
      // @ts-expect-error
      metric: {
        operation: 'count' as const,
        field: 'test_field',
      },
      shape: {
        // @ts-expect-error
        type: 'invalid',
      },
    } satisfies GaugeInput;

    expect(() => gaugeStateSchema.validate(input)).toThrow();
  });

  it('throws on invalid ticks value', () => {
    const input = {
      ...baseGaugeConfig,
      metric: {
        operation: 'count' as const,
        field: 'test_field',
        // @ts-expect-error
        ticks: 'invalid',
      },
    } satisfies GaugeInput;

    expect(() => gaugeStateSchema.validate(input)).toThrow();
  });
});
