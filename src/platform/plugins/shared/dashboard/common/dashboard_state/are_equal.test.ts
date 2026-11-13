/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardPanel, DashboardState } from '@kbn/as-code-dashboard-schema';
import { getControlsSchema } from '@kbn/controls-schemas';
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

const testPanel = (overrides: Record<string, unknown> = {}) =>
  ({
    type: 'testPanelType',
    grid: { x: 0, y: 0, w: 12, h: 8 },
    config: { title: 'Count' },
    ...overrides,
  } as DashboardPanel);

const pinnedPanel = (title = 'Host', id?: string) =>
  getControlsSchema().parse({
    ...(id !== undefined && { id }),
    type: 'options_list_control',
    config: { title, data_view_id: 'logs', field_name: 'host.name' },
  });

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

  it('does not load comparators when the layout differs', async () => {
    const getPanelComparators = jest.fn(getComparators);

    expect(
      await areEqual(
        state({ panels: [testPanel({ id: 'panel-1' })] }),
        state({ panels: [testPanel({ id: 'panel-2' })] }),
        getPanelComparators
      )
    ).toBe(false);
    expect(getPanelComparators).not.toHaveBeenCalled();
  });

  it('is not equal when pinned panel order changes', async () => {
    const a = pinnedPanel('A', 'control-a');
    const b = pinnedPanel('B', 'control-b');

    expect(
      await areEqual(
        state({ pinned_panels: [a, b] }),
        state({ pinned_panels: [b, a] }),
        getComparators
      )
    ).toBe(false);
  });

  describe('layout identity', () => {
    type LayoutCase = [string, (title: string) => Partial<DashboardState>];

    const idlessLayouts: LayoutCase[] = [
      ['panel', (title) => ({ panels: [testPanel({ config: { title } })] })],
      [
        'section and child',
        (title) => ({
          panels: [
            {
              title: 'Logs',
              collapsed: false,
              grid: { y: 0 },
              panels: [testPanel({ config: { title } })],
            },
          ],
        }),
      ],
      ['pinned panel', (title) => ({ panels: [], pinned_panels: [pinnedPanel(title)] })],
    ];

    it.each(idlessLayouts)(
      'compares identical ID-less %s layouts without mutation',
      async (_, layout) => {
        const baseline = state(layout('Count'));
        const current = state(layout('Count'));
        const originalBaseline = JSON.stringify(baseline);
        const originalCurrent = JSON.stringify(current);

        expect(await areEqual(baseline, baseline, getComparators)).toBe(true);
        expect(await areEqual(baseline, current, getComparators)).toBe(true);
        expect(JSON.stringify(baseline)).toBe(originalBaseline);
        expect(JSON.stringify(current)).toBe(originalCurrent);
      }
    );

    it.each(idlessLayouts)('detects config changes in an ID-less %s', async (_, layout) => {
      expect(await areEqual(state(layout('Count')), state(layout('Errors')), getComparators)).toBe(
        false
      );
    });

    const explicitLayouts: LayoutCase[] = [
      ['panel', (id) => ({ panels: [testPanel({ id })] })],
      [
        'section',
        (id) => ({
          panels: [{ title: 'Logs', collapsed: false, grid: { y: 0 }, id, panels: [testPanel()] }],
        }),
      ],
      [
        'section child',
        (id) => ({
          panels: [
            { title: 'Logs', collapsed: false, grid: { y: 0 }, panels: [testPanel({ id })] },
          ],
        }),
      ],
      ['pinned panel', (id) => ({ panels: [], pinned_panels: [pinnedPanel('Host', id)] })],
    ];

    it.each(explicitLayouts)('treats different explicit %s IDs as a change', async (_, layout) => {
      expect(await areEqual(state(layout('first')), state(layout('second')), getComparators)).toBe(
        false
      );
    });

    const collidingLayouts: LayoutCase[] = [
      [
        'panel',
        (title) => ({
          panels: [testPanel({ config: { title } }), testPanel({ id: '__generated:panel:0' })],
        }),
      ],
      [
        'section child',
        (title) => ({
          panels: [
            {
              title: 'Logs',
              collapsed: false,
              grid: { y: 0 },
              panels: [
                testPanel({ config: { title } }),
                testPanel({ id: '__generated:panel:0:0' }),
              ],
            },
          ],
        }),
      ],
      [
        'pinned panel',
        (title) => ({
          panels: [],
          pinned_panels: [pinnedPanel(title), pinnedPanel('Host', '__generated:pinned:0')],
        }),
      ],
    ];

    it.each(collidingLayouts)('avoids collisions with explicit %s IDs', async (_, layout) => {
      const baseline = state(layout('Count'));

      expect(await areEqual(baseline, state(layout('Count')), getComparators)).toBe(true);
      expect(await areEqual(baseline, state(layout('Errors')), getComparators)).toBe(false);
    });
  });
});
