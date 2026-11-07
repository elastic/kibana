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
import type { SerializedStateComparison, StateComparators } from '@kbn/presentation-publishing';
import { logger } from '../services/logger';
import { DEFAULT_DASHBOARD_OPTIONS } from '../../common/constants';
import { diffDashboardStates } from './compare_dashboard_state';

const section = (collapsed: boolean) => ({
  id: 'section-1',
  title: 'Logs',
  collapsed,
  grid: { y: 0 },
  panels: [],
});

const comparison = (
  compare: (baseline: never, current: never) => boolean
): SerializedStateComparison => {
  const comparators: StateComparators<{ whole_state?: unknown }> = {
    whole_state: (_baselineValue, _currentValue, baseline, current) =>
      compare(baseline as never, current as never),
  };
  return { comparators };
};

const diffStates = (
  baseline: DashboardState,
  current: DashboardState,
  comparisons: Record<string, SerializedStateComparison> = {}
) => diffDashboardStates(baseline, current, async (type) => comparisons[type]);

const state = (overrides: Partial<DashboardState> = {}): DashboardState =>
  ({
    title: 'Logs',
    description: 'Overview',
    panels: [section(false)],
    ...overrides,
  } as DashboardState);

describe('diffDashboardStates', () => {
  it('finds no changes between a closed and reopened section', async () => {
    expect(await diffStates(state(), state({ panels: [section(false)] }))).toEqual({});
  });

  it('returns the current panels when a section is closed', async () => {
    const current = state({ panels: [section(true)] });

    expect(await diffStates(state(), current)).toEqual({ panels: current.panels });
  });

  it('ignores fields the unsaved-changes manager does not compare', async () => {
    expect(
      await diffStates(
        state(),
        state({
          access_control: { accessMode: 'read' },
        } as Partial<DashboardState>)
      )
    ).toEqual({});
  });

  it('returns a changed title', async () => {
    expect(await diffStates(state(), state({ title: 'Errors' }))).toEqual({ title: 'Errors' });
  });

  it('returns all current options when one option changes', async () => {
    const options = {
      ...DEFAULT_DASHBOARD_OPTIONS,
      use_margins: !DEFAULT_DASHBOARD_OPTIONS.use_margins,
    };

    expect(await diffStates(state(), state({ options }))).toEqual({ options });
  });

  it('treats a missing ES|QL approximation as off', async () => {
    expect(await diffStates(state(), state({ esql_approximation: false }))).toEqual({});
    expect(await diffStates(state(), state({ esql_approximation: true }))).toEqual({
      esql_approximation: true,
    });
  });

  it('returns a changed project routing', async () => {
    expect(
      await diffStates(
        state({ project_routing: '_alias:_origin' }),
        state({ project_routing: '_alias:_origin' })
      )
    ).toEqual({});
    expect(
      await diffStates(
        state({ project_routing: '_alias:_origin' }),
        state({ project_routing: '_alias:*' })
      )
    ).toEqual({ project_routing: '_alias:*' });
  });

  it('compares the time range and refresh interval only with time restore on', async () => {
    const timeRange = { from: 'now-15m', to: 'now' };
    expect(
      await diffStates(
        state({ refresh_interval: { pause: false, value: 60000 } }),
        state({ refresh_interval: { pause: true, value: 60000 } })
      )
    ).toEqual({});
    expect(
      await diffStates(
        state({ time_range: timeRange, refresh_interval: { pause: false, value: 60000 } }),
        state({ time_range: timeRange, refresh_interval: { pause: true, value: 60000 } })
      )
    ).toEqual({ refresh_interval: { pause: true, value: 60000 } });
    expect(
      await diffStates(
        state({ time_range: timeRange }),
        state({ time_range: { from: 'now-1h', to: 'now' } })
      )
    ).toEqual({ time_range: { from: 'now-1h', to: 'now' } });
  });

  it('returns turning time restore on with the stored time range', async () => {
    const timeRange = { from: 'now-15m', to: 'now' };

    expect(await diffStates(state(), state({ time_range: timeRange }))).toEqual({
      time_restore: true,
      time_range: timeRange,
    });
  });

  it('returns only turning time restore off, like unsaved changes reads the current flag', async () => {
    const timeRange = { from: 'now-15m', to: 'now' };

    expect(
      await diffStates(
        state({ time_range: timeRange, refresh_interval: { pause: false, value: 60000 } }),
        state()
      )
    ).toStrictEqual({ time_restore: false });
  });

  it('returns only turning project routing restore off', async () => {
    expect(await diffStates(state({ project_routing: '_alias:_origin' }), state())).toStrictEqual({
      project_routing_restore: false,
    });
  });

  it('uses a panel comparator instead of the raw panel config', async () => {
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

    expect(await diffStates(baseline, current)).toEqual({ panels: current.panels });
    expect(
      await diffStates(baseline, current, {
        lens: comparison(
          (
            left: { attributes?: { title?: string } } | undefined,
            right: { attributes?: { title?: string } } | undefined
          ) => left?.attributes?.title === right?.attributes?.title
        ),
      })
    ).toEqual({});
  });

  it('returns a removed description or title', async () => {
    expect(await diffStates(state(), state({ description: undefined }))).toStrictEqual({
      description: undefined,
    });
    expect(await diffStates(state(), state({ title: '' }))).toStrictEqual({ title: '' });
  });

  describe('panels', () => {
    const lensPanel = (overrides: Record<string, unknown> = {}) =>
      ({
        type: 'lens',
        grid: { x: 0, y: 0, w: 12, h: 8 },
        config: { title: 'Count' },
        ...overrides,
      } as DashboardPanel);
    const ignoreConfig = () => true;
    const pinnedPanel = (title = 'Host', id?: string) =>
      getControlsSchema().parse({
        ...(id !== undefined && { id }),
        type: 'options_list_control',
        config: { title, data_view_id: 'logs', field_name: 'host.name' },
      });

    describe('layout identity', () => {
      type LayoutCase = [
        string,
        (title: string) => Partial<DashboardState>,
        'panels' | 'pinned_panels'
      ];

      const idlessLayouts: LayoutCase[] = [
        ['panel', (title) => ({ panels: [lensPanel({ config: { title } })] }), 'panels'],
        [
          'section and child',
          (title) => ({
            panels: [
              {
                title: 'Logs',
                collapsed: false,
                grid: { y: 0 },
                panels: [lensPanel({ config: { title } })],
              },
            ],
          }),
          'panels',
        ],
        [
          'pinned panel',
          (title) => ({ panels: [], pinned_panels: [pinnedPanel(title)] }),
          'pinned_panels',
        ],
      ];

      it.each(idlessLayouts)(
        'compares identical ID-less %s layouts without mutation',
        async (_, layout) => {
          const baseline = state(layout('Count'));
          const current = state(layout('Count'));
          const originalBaseline = JSON.stringify(baseline);
          const originalCurrent = JSON.stringify(current);

          expect(await diffStates(baseline, baseline)).toStrictEqual({});
          expect(await diffStates(baseline, current)).toStrictEqual({});
          expect(JSON.stringify(baseline)).toBe(originalBaseline);
          expect(JSON.stringify(current)).toBe(originalCurrent);
        }
      );

      it.each(idlessLayouts)('detects config changes in an ID-less %s', async (_, layout, key) => {
        const baseline = state(layout('Count'));
        const current = state(layout('Errors'));

        const diff = await diffStates(baseline, current);

        expect(diff).toStrictEqual({ [key]: current[key] });
        expect(diff[key]).toBe(current[key]);
      });

      const explicitLayouts: LayoutCase[] = [
        ['panel', (id) => ({ panels: [lensPanel({ id })] }), 'panels'],
        [
          'section',
          (id) => ({ panels: [{ ...section(false), id, panels: [lensPanel()] }] }),
          'panels',
        ],
        [
          'section child',
          (id) => ({ panels: [{ ...section(false), panels: [lensPanel({ id })] }] }),
          'panels',
        ],
        [
          'pinned panel',
          (id) => ({ panels: [], pinned_panels: [pinnedPanel('Host', id)] }),
          'pinned_panels',
        ],
      ];

      it.each(explicitLayouts)(
        'treats different explicit %s IDs as a change',
        async (_, layout, key) => {
          const baseline = state(layout('first'));
          const current = state(layout('second'));

          expect(await diffStates(baseline, current)).toStrictEqual({ [key]: current[key] });
        }
      );

      const collidingLayouts: LayoutCase[] = [
        [
          'panel',
          (title) => ({
            panels: [lensPanel({ config: { title } }), lensPanel({ id: '__comparison:panel:0' })],
          }),
          'panels',
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
                  lensPanel({ config: { title } }),
                  lensPanel({ id: '__comparison:panel:0:0' }),
                ],
              },
            ],
          }),
          'panels',
        ],
        [
          'pinned panel',
          (title) => ({
            panels: [],
            pinned_panels: [pinnedPanel(title), pinnedPanel('Host', '__comparison:pinned:0')],
          }),
          'pinned_panels',
        ],
      ];

      it.each(collidingLayouts)(
        'avoids collisions with explicit %s IDs',
        async (_, layout, key) => {
          const baseline = state(layout('Count'));
          const current = state(layout('Errors'));

          expect(await diffStates(baseline, state(layout('Count')))).toStrictEqual({});
          expect(await diffStates(baseline, current)).toStrictEqual({ [key]: current[key] });
        }
      );
    });

    describe('comparator failures', () => {
      beforeEach(() => {
        jest.spyOn(logger, 'warn').mockImplementation(() => {});
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('continues comparing pinned panels when a panel comparator throws', async () => {
        const baseline = state({
          panels: [lensPanel({ id: 'panel-1' })],
          pinned_panels: [pinnedPanel('Host', 'control-1')],
        });
        const current = state({
          panels: [lensPanel({ id: 'panel-1' })],
          pinned_panels: [pinnedPanel('Updated host', 'control-1')],
        });
        const error = new Error('Cannot compare panel state');
        const comparePinnedPanel = jest.fn(() => false);

        expect(
          await diffStates(baseline, current, {
            lens: comparison(() => {
              throw error;
            }),
            options_list_control: comparison(comparePinnedPanel),
          })
        ).toStrictEqual({ panels: current.panels, pinned_panels: current.pinned_panels });
        expect(comparePinnedPanel).toHaveBeenCalledWith(
          baseline.pinned_panels?.[0].config,
          current.pinned_panels?.[0].config
        );
        expect(logger.warn).toHaveBeenCalledWith(
          'Unable to compare serialized state for dashboard panel "panel-1".',
          { error }
        );
      });

      it('returns pinned panels when their comparator throws', async () => {
        const baseline = state({
          pinned_panels: [pinnedPanel('Host', 'control-1')],
        });
        const current = state({
          pinned_panels: [pinnedPanel('Host', 'control-1')],
        });
        const error = new Error('Cannot compare control state');

        expect(
          await diffStates(baseline, current, {
            options_list_control: comparison(() => {
              throw error;
            }),
          })
        ).toStrictEqual({ pinned_panels: current.pinned_panels });
        expect(logger.warn).toHaveBeenCalledWith(
          'Unable to compare serialized state for dashboard panel "control-1".',
          { error }
        );
      });
    });

    it('returns the panels when a panel type changes', async () => {
      const current = state({ panels: [lensPanel({ id: 'panel-1', type: 'visualization' })] });

      expect(
        await diffStates(state({ panels: [lensPanel({ id: 'panel-1' })] }), current, {
          lens: comparison(ignoreConfig),
        })
      ).toEqual({ panels: current.panels });
    });

    it('returns the panels when a library panel points to another library item', async () => {
      const libraryPanel = (refId: string) =>
        lensPanel({ id: 'panel-1', config: { ref_id: refId } });
      const current = state({ panels: [libraryPanel('library-b')] });

      expect(
        await diffStates(state({ panels: [libraryPanel('library-a')] }), current, {
          lens: comparison(ignoreConfig),
        })
      ).toEqual({ panels: current.panels });
    });
  });
});
