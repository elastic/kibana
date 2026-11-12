/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Capabilities } from '@kbn/core/public';
import { ESQLVariableType } from '@kbn/esql-types';
import { CHANGE_POINT_GRID_EMBEDDABLE_TYPE } from '../../../../../common';
import {
  canAddChangePointChartsToDashboard,
  toChangePointDashboardPackages,
} from './add_page_to_dashboard_packages';

const page = {
  esql: 'FROM logs-* | CHANGE_POINT count ON @timestamp',
};

const context = {
  timeRange: { from: '2020-01-01T00:00:00.000Z', to: '2020-01-02T00:00:00.000Z' },
  filters: [
    {
      meta: {
        alias: null,
        disabled: false,
        negate: false,
        key: 'status',
        field: 'status',
        params: { query: 'active' },
        type: 'phrase',
      },
      match_phrase: { status: 'active' },
    },
  ],
  inputQuery: { query: 'status:active', language: 'kuery' as const },
  esqlVariables: [{ key: 'service', value: 'orders', type: ESQLVariableType.VALUES }],
  controlsState: {
    control1: {
      type: 'esqlControl',
      order: 0,
      width: 'small',
      grow: false,
      fieldName: 'service',
    },
  } as never,
};

describe('toChangePointDashboardPackages', () => {
  it('creates one change point panel and appends each control when the panel follows the dashboard', () => {
    const packages = toChangePointDashboardPackages({
      page,
      applyDashboardContext: true,
      ...context,
    });

    expect(packages).toEqual([
      {
        type: CHANGE_POINT_GRID_EMBEDDABLE_TYPE,
        serializedState: {
          esql: page.esql,
          apply_dashboard_context: true,
        },
        size: {
          width: 48,
          height: 19,
        },
      },
      {
        type: 'esqlControl',
        serializedState: { fieldName: 'service' },
      },
    ]);
  });

  it('uses one chart row when the page is a single series', () => {
    const packages = toChangePointDashboardPackages({
      page: { ...page, singleSeries: true },
      applyDashboardContext: true,
      ...context,
    });

    expect(packages[0].size).toEqual({ width: 48, height: 11 });
  });

  it('stores the Discover context and omits controls when the panel is static', () => {
    const packages = toChangePointDashboardPackages({
      page,
      applyDashboardContext: false,
      ...context,
    });

    expect(packages).toHaveLength(1);
    expect(packages[0].type).toBe(CHANGE_POINT_GRID_EMBEDDABLE_TYPE);
    expect(packages[0].serializedState).toEqual(
      expect.objectContaining({
        apply_dashboard_context: false,
        static_context: expect.objectContaining({
          query: { expression: 'status:active', language: 'kql' },
          esql_variables: [{ key: 'service', value: 'orders', type: ESQLVariableType.VALUES }],
        }),
        time_range: context.timeRange,
      })
    );
    expect(
      (packages[0].serializedState as { static_context: { filters?: unknown[] } }).static_context
        .filters
    ).toEqual([
      expect.objectContaining({
        type: 'condition',
      }),
    ]);
  });
});

describe('canAddChangePointChartsToDashboard', () => {
  it('allows create or edit dashboard access', () => {
    expect(canAddChangePointChartsToDashboard({} as Capabilities)).toBe(false);
    expect(
      canAddChangePointChartsToDashboard({
        dashboard_v2: { createNew: true },
      } as unknown as Capabilities)
    ).toBe(true);
    expect(
      canAddChangePointChartsToDashboard({
        dashboard_v2: { showWriteControls: true },
      } as unknown as Capabilities)
    ).toBe(true);
  });
});
