/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChangePointGridConfiguration } from '@kbn/discover-utils';
import { ESQLVariableType } from '@kbn/esql-types';
import {
  changePointGridEmbeddableSchema,
  type ChangePointGridEmbeddableState,
} from './change_point_grid_schema';

type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const configurationMatchesSharedContract: AssertEqual<
  NonNullable<ChangePointGridEmbeddableState['configuration']>,
  ChangePointGridConfiguration
> = true;

const validState = {
  esql: 'FROM logs-* | CHANGE_POINT count ON @timestamp',
  apply_dashboard_context: true,
};

describe('changePointGridEmbeddableSchema', () => {
  it('accepts a following panel and a static panel', () => {
    expect(changePointGridEmbeddableSchema.safeParse(validState).success).toBe(true);
    expect(
      changePointGridEmbeddableSchema.safeParse({
        ...validState,
        apply_dashboard_context: false,
        time_range: { from: '2020-01-01T00:00:00.000Z', to: '2020-01-02T00:00:00.000Z' },
        static_context: {
          query: { expression: 'status:active', language: 'kql' },
          esql_variables: [{ key: 'service', value: 'orders', type: ESQLVariableType.VALUES }],
        },
      }).success
    ).toBe(true);
  });

  it('accepts a static panel with no captured context', () => {
    expect(
      changePointGridEmbeddableSchema.safeParse({
        ...validState,
        apply_dashboard_context: false,
      }).success
    ).toBe(true);
  });

  it('rejects an oversized query and time range', () => {
    expect(
      changePointGridEmbeddableSchema.safeParse({
        ...validState,
        esql: 'x'.repeat(10_001),
      }).success
    ).toBe(false);
    expect(
      changePointGridEmbeddableSchema.safeParse({
        ...validState,
        time_range: { from: 'x'.repeat(129), to: 'now' },
      }).success
    ).toBe(false);
  });

  it('drops unknown fields added by a later version', () => {
    const parsed = changePointGridEmbeddableSchema.safeParse({
      ...validState,
      series: [],
      static_context: {
        extra: true,
        esql_variables: [
          { key: 'service', value: 'orders', type: ESQLVariableType.VALUES, extra: true },
        ],
      },
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }
    expect(parsed.data).toEqual({
      ...validState,
      static_context: {
        esql_variables: [{ key: 'service', value: 'orders', type: ESQLVariableType.VALUES }],
      },
    });
  });

  it('accepts form and direct-ES|QL configurations and keeps the shared type contract aligned', () => {
    expect(configurationMatchesSharedContract).toBe(true);

    const formParsed = changePointGridEmbeddableSchema.safeParse({
      ...validState,
      configuration: {
        mode: 'form',
        data_view_id: 'logs-*',
        aggregation_function: 'avg',
        metric_field: 'bytes',
        split_field: 'host.name',
        partitions: ['web-1', 'web-2'],
        extra: 'ignored',
      },
    });
    expect(formParsed.success).toBe(true);
    if (formParsed.success) {
      expect(formParsed.data.configuration).toEqual({
        mode: 'form',
        data_view_id: 'logs-*',
        aggregation_function: 'avg',
        metric_field: 'bytes',
        split_field: 'host.name',
        partitions: ['web-1', 'web-2'],
      });
    }

    const esqlParsed = changePointGridEmbeddableSchema.safeParse({
      ...validState,
      configuration: {
        mode: 'esql',
        extra: 'ignored',
      },
    });
    expect(esqlParsed.success).toBe(true);
    if (esqlParsed.success) {
      expect(esqlParsed.data.configuration).toEqual({ mode: 'esql' });
    }
  });

  it('rejects oversized partition values, too many partitions, and partitions without split_field', () => {
    expect(
      changePointGridEmbeddableSchema.safeParse({
        ...validState,
        configuration: {
          mode: 'form',
          data_view_id: 'logs-*',
          aggregation_function: 'avg',
          metric_field: 'bytes',
          split_field: 'host.name',
          partitions: ['x'.repeat(2_049)],
        },
      }).success
    ).toBe(false);

    expect(
      changePointGridEmbeddableSchema.safeParse({
        ...validState,
        configuration: {
          mode: 'form',
          data_view_id: 'logs-*',
          aggregation_function: 'avg',
          metric_field: 'bytes',
          split_field: 'host.name',
          partitions: Array.from({ length: 101 }, (_, index) => `host-${index}`),
        },
      }).success
    ).toBe(false);

    expect(
      changePointGridEmbeddableSchema.safeParse({
        ...validState,
        configuration: {
          mode: 'form',
          data_view_id: 'logs-*',
          aggregation_function: 'avg',
          metric_field: 'bytes',
          partitions: ['web-1'],
        },
      }).success
    ).toBe(false);
  });
});
