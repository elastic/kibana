/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardPanel, DashboardState } from '@kbn/as-code-dashboard-schema';
import { DEFAULT_DASHBOARD_OPTIONS } from '../../common/constants';
import { diffDashboardStates } from './compare_dashboard_state';

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

describe('diffDashboardStates', () => {
  it('finds no changes between a closed and reopened section', () => {
    expect(diffDashboardStates(state(), state({ panels: [section(false)] }))).toEqual({});
  });

  it('returns the current panels when a section is closed', () => {
    const current = state({ panels: [section(true)] });

    expect(diffDashboardStates(state(), current)).toEqual({ panels: current.panels });
  });

  it('ignores fields the unsaved-changes manager does not compare', () => {
    expect(
      diffDashboardStates(
        state(),
        state({
          access_control: { accessMode: 'read' },
        } as Partial<DashboardState>)
      )
    ).toEqual({});
  });

  it('returns a changed title', () => {
    expect(diffDashboardStates(state(), state({ title: 'Errors' }))).toEqual({ title: 'Errors' });
  });

  it('returns all current options when one option changes', () => {
    const options = {
      ...DEFAULT_DASHBOARD_OPTIONS,
      use_margins: !DEFAULT_DASHBOARD_OPTIONS.use_margins,
    };

    expect(diffDashboardStates(state(), state({ options }))).toEqual({ options });
  });

  it('treats a missing ES|QL approximation as off', () => {
    expect(diffDashboardStates(state(), state({ esql_approximation: false }))).toEqual({});
    expect(diffDashboardStates(state(), state({ esql_approximation: true }))).toEqual({
      esql_approximation: true,
    });
  });

  it('returns a changed project routing', () => {
    expect(
      diffDashboardStates(
        state({ project_routing: '_alias:_origin' }),
        state({ project_routing: '_alias:_origin' })
      )
    ).toEqual({});
    expect(
      diffDashboardStates(
        state({ project_routing: '_alias:_origin' }),
        state({ project_routing: '_alias:*' })
      )
    ).toEqual({ project_routing: '_alias:*' });
  });

  it('compares the time range and refresh interval only with time restore on', () => {
    const timeRange = { from: 'now-15m', to: 'now' };
    expect(
      diffDashboardStates(
        state({ refresh_interval: { pause: false, value: 60000 } }),
        state({ refresh_interval: { pause: true, value: 60000 } })
      )
    ).toEqual({});
    expect(
      diffDashboardStates(
        state({ time_range: timeRange, refresh_interval: { pause: false, value: 60000 } }),
        state({ time_range: timeRange, refresh_interval: { pause: true, value: 60000 } })
      )
    ).toEqual({ refresh_interval: { pause: true, value: 60000 } });
    expect(
      diffDashboardStates(
        state({ time_range: timeRange }),
        state({ time_range: { from: 'now-1h', to: 'now' } })
      )
    ).toEqual({ time_range: { from: 'now-1h', to: 'now' } });
  });

  it('returns turning time restore on with the stored time range', () => {
    const timeRange = { from: 'now-15m', to: 'now' };

    expect(diffDashboardStates(state(), state({ time_range: timeRange }))).toEqual({
      time_restore: true,
      time_range: timeRange,
    });
  });

  it('returns only turning time restore off, like unsaved changes reads the current flag', () => {
    const timeRange = { from: 'now-15m', to: 'now' };

    expect(
      diffDashboardStates(
        state({ time_range: timeRange, refresh_interval: { pause: false, value: 60000 } }),
        state()
      )
    ).toStrictEqual({ time_restore: false });
  });

  it('returns only turning project routing restore off', () => {
    expect(
      diffDashboardStates(state({ project_routing: '_alias:_origin' }), state())
    ).toStrictEqual({
      project_routing_restore: false,
    });
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

    expect(diffDashboardStates(baseline, current)).toEqual({ panels: current.panels });
    expect(
      diffDashboardStates(baseline, current, {
        'panel-1': {
          type: 'lens',
          compareSerializedState: (
            left: { attributes?: { title?: string } } | undefined,
            right: { attributes?: { title?: string } } | undefined
          ) => left?.attributes?.title === right?.attributes?.title,
        },
      })
    ).toEqual({});
  });

  it('returns a removed description or title', () => {
    expect(diffDashboardStates(state(), state({ description: undefined }))).toStrictEqual({
      description: undefined,
    });
    expect(diffDashboardStates(state(), state({ title: '' }))).toStrictEqual({ title: '' });
  });

  describe('panels', () => {
    const lensPanel = (overrides: Record<string, unknown> = {}) =>
      ({
        type: 'lens',
        grid: { x: 0, y: 0, w: 12, h: 8 },
        config: { title: 'Count' },
        ...overrides,
      } as DashboardPanel);
    const panelsState = (panel: DashboardPanel) =>
      state({
        panels: [panel, { ...section(false), panels: [panel] }],
        pinned_panels: [{ type: 'options_list_control', width: 'medium', config: {} }],
      } as Partial<DashboardState>);
    const ignoreConfig = { compareSerializedState: () => true };

    it('finds no changes between equal panels without ids', () => {
      expect(diffDashboardStates(panelsState(lensPanel()), panelsState(lensPanel()))).toEqual({});
    });

    it('does not let a panel without an id collide with an explicit id', () => {
      const withFirstPanel = (title: string) =>
        state({
          panels: [
            lensPanel({ config: { title } }),
            lensPanel({ id: '__position_0', grid: { x: 12, y: 0, w: 12, h: 8 } }),
          ],
        });
      const current = withFirstPanel('Errors');

      expect(diffDashboardStates(withFirstPanel('Count'), current)).toEqual({
        panels: current.panels,
      });
    });

    it('returns the panels when a panel type changes', () => {
      const current = state({ panels: [lensPanel({ id: 'panel-1', type: 'visualization' })] });

      expect(
        diffDashboardStates(state({ panels: [lensPanel({ id: 'panel-1' })] }), current, {
          'panel-1': { type: 'lens', ...ignoreConfig },
        })
      ).toEqual({ panels: current.panels });
    });

    it('returns the panels when a library panel points to another library item', () => {
      const libraryPanel = (refId: string) =>
        lensPanel({ id: 'panel-1', config: { ref_id: refId } });
      const current = state({ panels: [libraryPanel('library-b')] });

      expect(
        diffDashboardStates(state({ panels: [libraryPanel('library-a')] }), current, {
          'panel-1': { type: 'lens', ...ignoreConfig },
        })
      ).toEqual({ panels: current.panels });
    });
  });
});
