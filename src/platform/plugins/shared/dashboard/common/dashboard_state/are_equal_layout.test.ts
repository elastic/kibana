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
import type { StateComparators } from '@kbn/presentation-publishing';
import { areEqual } from './are_equal';
import type { GetComparators } from './layout';

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

const PANEL_TYPE = 'testPanelType';
const OTHER_PANEL_TYPE = 'otherPanelType';

const testPanel = (overrides: Record<string, unknown> = {}) =>
  ({
    type: PANEL_TYPE,
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

const noComparators: GetComparators = async () => undefined;

describe('areEqual layout', () => {
  it('is equal when nothing changed', async () => {
    expect(await areEqual(state(), state({ panels: [section(false)] }), noComparators)).toBe(true);
  });

  it('is not equal when a section is collapsed', async () => {
    expect(await areEqual(state(), state({ panels: [section(true)] }), noComparators)).toBe(false);
  });

  it('does not load comparators when the layout differs', async () => {
    const getComparators = jest.fn(noComparators);
    expect(
      await areEqual(
        state({ panels: [testPanel({ id: 'panel-1' })] }),
        state({ panels: [testPanel({ id: 'panel-2' })] }),
        noComparators
      )
    ).toBe(false);
    expect(getComparators).not.toHaveBeenCalled();
  });

  it('uses a panel comparator instead of the raw panel config', async () => {
    const panel = (references: object[]) =>
      testPanel({
        id: 'panel-1',
        config: { attributes: { title: 'Count' }, references },
      });
    const baseline = state({ panels: [panel([])] });
    const current = state({ panels: [panel([{ id: 'ref' }])] });

    expect(await areEqual(baseline, current, noComparators)).toBe(false);
    expect(
      await areEqual(
        baseline,
        current,
        async () =>
          ({
            attributes: (a: { title?: string } | undefined, b: { title?: string } | undefined) =>
              a?.title === b?.title,
          } as StateComparators<object>)
      )
    ).toBe(true);
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

        expect(await areEqual(baseline, baseline, noComparators)).toBe(true);
        expect(await areEqual(baseline, current, noComparators)).toBe(true);
        expect(JSON.stringify(baseline)).toBe(originalBaseline);
        expect(JSON.stringify(current)).toBe(originalCurrent);
      }
    );

    it.each(idlessLayouts)('detects config changes in an ID-less %s', async (_, layout) => {
      expect(await areEqual(state(layout('Count')), state(layout('Errors')), noComparators)).toBe(
        false
      );
    });

    const explicitLayouts: LayoutCase[] = [
      ['panel', (id) => ({ panels: [testPanel({ id })] })],
      ['section', (id) => ({ panels: [{ ...section(false), id, panels: [testPanel()] }] })],
      ['section child', (id) => ({ panels: [{ ...section(false), panels: [testPanel({ id })] }] })],
      ['pinned panel', (id) => ({ panels: [], pinned_panels: [pinnedPanel('Host', id)] })],
    ];

    it.each(explicitLayouts)('treats different explicit %s IDs as a change', async (_, layout) => {
      expect(await areEqual(state(layout('first')), state(layout('second')), noComparators)).toBe(
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

      expect(await areEqual(baseline, state(layout('Count')), noComparators)).toBe(true);
      expect(await areEqual(baseline, state(layout('Errors')), noComparators)).toBe(false);
    });
  });

  describe('pinned panels', () => {
    it('is not equal when pinned panel order changes', async () => {
      const a = pinnedPanel('A', 'control-a');
      const b = pinnedPanel('B', 'control-b');

      expect(
        await areEqual(
          state({ panels: [], pinned_panels: [a, b] }),
          state({ panels: [], pinned_panels: [b, a] }),
          noComparators
        )
      ).toBe(false);
    });

    it('uses the pinned panel comparator for its config', async () => {
      const baseline = state({ panels: [], pinned_panels: [pinnedPanel('Host', 'control-1')] });
      const current = state({
        panels: [],
        pinned_panels: [pinnedPanel('Updated host', 'control-1')],
      });

      expect(await areEqual(baseline, current, noComparators)).toBe(false);
      expect(await areEqual(baseline, current, async () => ({}))).toBe(true);
    });
  });

  describe('comparator failures', () => {
    const throwing = (): StateComparators<object> => ({
      title: () => {
        throw new Error('Cannot compare state');
      },
    });

    it('is not equal when a panel comparator throws', async () => {
      const baseline = state({ panels: [testPanel({ id: 'panel-1' })] });
      const current = state({ panels: [testPanel({ id: 'panel-1' })] });

      expect(await areEqual(baseline, current, async () => throwing())).toBe(false);
    });

    it('is not equal when a pinned panel comparator throws', async () => {
      const baseline = state({ panels: [], pinned_panels: [pinnedPanel('Host', 'control-1')] });
      const current = state({ panels: [], pinned_panels: [pinnedPanel('Host', 'control-1')] });

      expect(await areEqual(baseline, current, async () => throwing())).toBe(false);
    });

    it('is not equal when loading comparators rejects', async () => {
      const panels = [testPanel({ id: 'panel-1' })];
      const rejectingComparators: GetComparators = async () => {
        throw new Error('Cannot load comparators');
      };

      expect(await areEqual(state({ panels }), state({ panels }), rejectingComparators)).toBe(
        false
      );
    });
  });

  it('is not equal when a panel type changes', async () => {
    expect(
      await areEqual(
        state({ panels: [testPanel({ id: 'panel-1' })] }),
        state({ panels: [testPanel({ id: 'panel-1', type: OTHER_PANEL_TYPE })] }),
        async () => undefined
      )
    ).toBe(false);
  });
});
