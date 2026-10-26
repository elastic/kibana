/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { dashboardStatesMatch } from './compare_dashboard_state';

const section = (collapsed: boolean) => ({
  id: 'section-1',
  title: 'Logs',
  collapsed,
  grid: { y: 0 },
  panels: [],
});

const state = (overrides: Partial<DashboardState> = {}): DashboardState =>
  ({
    title: 'Logs',
    description: 'Overview',
    panels: [section(false)],
    ...overrides,
  } as DashboardState);

describe('dashboardStatesMatch', () => {
  it('treats a closed and reopened section as the same state', () => {
    expect(dashboardStatesMatch(state(), state({ panels: [section(false)] }))).toBe(true);
  });

  it('treats a closed section as a different state', () => {
    expect(dashboardStatesMatch(state(), state({ panels: [section(true)] }))).toBe(false);
  });

  it('ignores fields the unsaved-changes manager does not compare', () => {
    expect(
      dashboardStatesMatch(
        state(),
        state({
          access_control: { accessMode: 'read' },
        } as Partial<DashboardState>)
      )
    ).toBe(true);
  });

  it('treats a missing ES|QL approximation as off', () => {
    expect(dashboardStatesMatch(state(), state({ esql_approximation: false }))).toBe(true);
    expect(dashboardStatesMatch(state(), state({ esql_approximation: true }))).toBe(false);
  });

  it('compares the project routing', () => {
    expect(
      dashboardStatesMatch(
        state({ project_routing: '_alias:_origin' }),
        state({ project_routing: '_alias:_origin' })
      )
    ).toBe(true);
    expect(
      dashboardStatesMatch(
        state({ project_routing: '_alias:_origin' }),
        state({ project_routing: '_alias:*' })
      )
    ).toBe(false);
  });

  it('compares the time range and refresh interval only with time restore on', () => {
    const timeRange = { from: 'now-15m', to: 'now' };
    expect(
      dashboardStatesMatch(
        state({ refresh_interval: { pause: false, value: 60000 } }),
        state({ refresh_interval: { pause: true, value: 60000 } })
      )
    ).toBe(true);
    expect(
      dashboardStatesMatch(
        state({ time_range: timeRange, refresh_interval: { pause: false, value: 60000 } }),
        state({ time_range: timeRange, refresh_interval: { pause: true, value: 60000 } })
      )
    ).toBe(false);
    expect(
      dashboardStatesMatch(
        state({ time_range: timeRange }),
        state({ time_range: { from: 'now-1h', to: 'now' } })
      )
    ).toBe(false);
  });

  it('uses a panel comparator instead of the raw panel config', () => {
    const baseline = state({
      panels: [
        {
          id: 'panel-1',
          type: 'lens',
          grid: { x: 0, y: 0, w: 12, h: 8 },
          config: { attributes: { title: 'Count' }, references: [] },
        },
      ],
    });
    const current = state({
      panels: [
        {
          id: 'panel-1',
          type: 'lens',
          grid: { x: 0, y: 0, w: 12, h: 8 },
          config: { attributes: { title: 'Count' }, references: [{ id: 'ref' }] },
        },
      ],
    });

    expect(dashboardStatesMatch(baseline, current)).toBe(false);
    expect(
      dashboardStatesMatch(baseline, current, {
        'panel-1': {
          compareSerializedState: (
            left: { attributes?: { title?: string } } | undefined,
            right: { attributes?: { title?: string } } | undefined
          ) => left?.attributes?.title === right?.attributes?.title,
        },
      })
    ).toBe(true);
  });
});
