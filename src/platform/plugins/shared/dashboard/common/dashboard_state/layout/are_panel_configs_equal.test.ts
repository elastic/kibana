/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardPanel } from '@kbn/as-code-dashboard-schema';
import { getControlsSchema } from '@kbn/controls-schemas';
import type { StateComparators } from '@kbn/presentation-publishing';
import { deserializeLayout } from './deserialize_layout';
import {
  arePanelConfigsEqual,
  arePinnedPanelConfigsEqual,
  type GetComparators,
} from './are_panel_configs_equal';

const PANEL_TYPE = 'testPanelType';

const testPanel = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'panel-1',
    type: PANEL_TYPE,
    grid: { x: 0, y: 0, w: 12, h: 8 },
    config: { title: 'Count' },
    ...overrides,
  } as DashboardPanel);

const pinnedPanel = (title = 'Host') =>
  getControlsSchema().parse({
    id: 'control-1',
    type: 'options_list_control',
    config: { title, data_view_id: 'logs', field_name: 'host.name' },
  });

const noComparators: GetComparators = async () => undefined;

const throwing = (): StateComparators<object> => ({
  title: () => {
    throw new Error('Cannot compare state');
  },
});

const rejectingComparators: GetComparators = async () => {
  throw new Error('Cannot load comparators');
};

describe('arePanelConfigsEqual', () => {
  const deserialize = (panel: DashboardPanel) => deserializeLayout([panel], []);

  it('is equal when configs are deep equal and no comparators exist', async () => {
    expect(
      await arePanelConfigsEqual(deserialize(testPanel()), deserialize(testPanel()), noComparators)
    ).toBe(true);
  });

  it('is not equal when configs differ and no comparators exist', async () => {
    expect(
      await arePanelConfigsEqual(
        deserialize(testPanel()),
        deserialize(testPanel({ config: { title: 'Errors' } })),
        noComparators
      )
    ).toBe(false);
  });

  it('uses a panel comparator instead of the raw panel config', async () => {
    const panel = (references: object[]) =>
      testPanel({ config: { attributes: { title: 'Count' }, references } });
    const baseline = deserialize(panel([]));
    const current = deserialize(panel([{ id: 'ref' }]));

    expect(await arePanelConfigsEqual(baseline, current, noComparators)).toBe(false);
    expect(
      await arePanelConfigsEqual(
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

  it('is not equal when the panel type changes', async () => {
    expect(
      await arePanelConfigsEqual(
        deserialize(testPanel()),
        deserialize(testPanel({ type: 'otherPanelType' })),
        noComparators
      )
    ).toBe(false);
  });

  it('is not equal when a comparator throws', async () => {
    expect(
      await arePanelConfigsEqual(deserialize(testPanel()), deserialize(testPanel()), async () =>
        throwing()
      )
    ).toBe(false);
  });

  it('is not equal when loading comparators rejects', async () => {
    expect(
      await arePanelConfigsEqual(
        deserialize(testPanel()),
        deserialize(testPanel()),
        rejectingComparators
      )
    ).toBe(false);
  });
});

describe('arePinnedPanelConfigsEqual', () => {
  const deserialize = (title?: string) => deserializeLayout([], [pinnedPanel(title)]);

  it('is equal when configs are deep equal and no comparators exist', async () => {
    expect(await arePinnedPanelConfigsEqual(deserialize(), deserialize(), noComparators)).toBe(
      true
    );
  });

  it('is not equal when configs differ and no comparators exist', async () => {
    expect(
      await arePinnedPanelConfigsEqual(
        deserialize('Host'),
        deserialize('Updated host'),
        noComparators
      )
    ).toBe(false);
  });

  it('uses the pinned panel comparator for its config', async () => {
    const baseline = deserialize('Host');
    const current = deserialize('Updated host');

    expect(await arePinnedPanelConfigsEqual(baseline, current, noComparators)).toBe(false);
    expect(await arePinnedPanelConfigsEqual(baseline, current, async () => ({}))).toBe(true);
  });

  it('is not equal when a comparator throws', async () => {
    expect(
      await arePinnedPanelConfigsEqual(deserialize(), deserialize(), async () => throwing())
    ).toBe(false);
  });

  it('is not equal when loading comparators rejects', async () => {
    expect(
      await arePinnedPanelConfigsEqual(deserialize(), deserialize(), rejectingComparators)
    ).toBe(false);
  });
});
