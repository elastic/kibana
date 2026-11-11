/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { DEFAULT_DASHBOARD_OPTIONS } from '../constants';
import { areEqual } from './are_equal';

const state = (overrides: Partial<DashboardState> = {}): DashboardState =>
  ({
    title: 'Logs',
    description: 'Overview',
    panels: [],
    ...overrides,
  } as DashboardState);

const getComparators = async () => undefined;

describe('areEqual', () => {
  it('is equal for identical states', async () => {
    expect(await areEqual(state(), state(), getComparators)).toBe(true);
  });

  it('is not equal when the title changes', async () => {
    expect(await areEqual(state(), state({ title: 'Errors' }), getComparators)).toBe(false);
  });

  it('is not equal when a title or description is removed', async () => {
    expect(await areEqual(state(), state({ description: undefined }), getComparators)).toBe(false);
    expect(await areEqual(state(), state({ title: '' }), getComparators)).toBe(false);
  });

  it('is not equal when one option changes', async () => {
    const options = {
      ...DEFAULT_DASHBOARD_OPTIONS,
      use_margins: !DEFAULT_DASHBOARD_OPTIONS.use_margins,
    };

    expect(await areEqual(state(), state({ options }), getComparators)).toBe(false);
  });

  it('treats a missing ES|QL approximation as off', async () => {
    expect(await areEqual(state(), state({ esql_approximation: false }), getComparators)).toBe(
      true
    );
    expect(await areEqual(state(), state({ esql_approximation: true }), getComparators)).toBe(
      false
    );
  });

  it('compares project routing', async () => {
    expect(
      await areEqual(
        state({ project_routing: '_alias:_origin' }),
        state({ project_routing: '_alias:_origin' }),
        getComparators
      )
    ).toBe(true);
    expect(
      await areEqual(
        state({ project_routing: '_alias:_origin' }),
        state({ project_routing: '_alias:*' }),
        getComparators
      )
    ).toBe(false);
  });

  it('is not equal when project routing is added or removed', async () => {
    expect(
      await areEqual(state(), state({ project_routing: '_alias:_origin' }), getComparators)
    ).toBe(false);
    expect(
      await areEqual(state({ project_routing: '_alias:_origin' }), state(), getComparators)
    ).toBe(false);
  });

  it('compares the time range and refresh interval only with time restore on', async () => {
    const timeRange = { from: 'now-15m', to: 'now' };
    expect(
      await areEqual(
        state({ refresh_interval: { pause: false, value: 60000 } }),
        state({ refresh_interval: { pause: true, value: 60000 } }),
        getComparators
      )
    ).toBe(true);
    expect(
      await areEqual(
        state({ time_range: timeRange, refresh_interval: { pause: false, value: 60000 } }),
        state({ time_range: timeRange, refresh_interval: { pause: true, value: 60000 } }),
        getComparators
      )
    ).toBe(false);
    expect(
      await areEqual(
        state({ time_range: timeRange }),
        state({ time_range: { from: 'now-1h', to: 'now' } }),
        getComparators
      )
    ).toBe(false);
  });

  it('is not equal when time restore is turned on or off', async () => {
    const timeRange = { from: 'now-15m', to: 'now' };

    expect(await areEqual(state(), state({ time_range: timeRange }), getComparators)).toBe(false);
    expect(await areEqual(state({ time_range: timeRange }), state(), getComparators)).toBe(false);
  });

  it('is not equal when a section is collapsed', async () => {
    const section = (collapsed: boolean) => ({
      id: 'section-1',
      title: 'Logs',
      collapsed,
      grid: { y: 0 },
      panels: [],
    });

    expect(
      await areEqual(
        state({ panels: [section(false)] }),
        state({ panels: [section(false)] }),
        getComparators
      )
    ).toBe(true);
    expect(
      await areEqual(
        state({ panels: [section(false)] }),
        state({ panels: [section(true)] }),
        getComparators
      )
    ).toBe(false);
  });
});
