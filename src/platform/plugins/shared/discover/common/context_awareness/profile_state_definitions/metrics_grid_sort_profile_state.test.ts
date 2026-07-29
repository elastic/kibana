/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_METRICS_SORT } from '@kbn/unified-chart-section-viewer';
import { METRICS_GRID_SORT_DEFAULTS } from '@kbn/discover-utils';
import { ProfileStateRegistry, ProfileStateType } from '../profile_state';
import { METRICS_GRID_SORT_STATE_DEF } from './metrics_grid_sort_profile_state';

const KEY = 'metricsGridSort';

const createRegistry = () => {
  const registry = new ProfileStateRegistry();
  registry.registerDefinition(METRICS_GRID_SORT_STATE_DEF);
  return registry;
};

describe('METRICS_GRID_SORT_STATE_DEF', () => {
  it('registers with a matching descriptor and default state', () => {
    const registry = createRegistry();

    expect(registry.hasDefinition(METRICS_GRID_SORT_STATE_DEF)).toBe(true);
  });

  it('types both fields as Persistent so the host persists them locally and in saved sessions', () => {
    expect(METRICS_GRID_SORT_STATE_DEF.descriptor).toEqual({
      field: { type: ProfileStateType.Persistent },
      direction: { type: ProfileStateType.Persistent },
    });
  });

  it('fills in defaults when expanding a partial sort (what the host writes to storage)', () => {
    const registry = createRegistry();

    const expanded = registry.pickStateByType({
      profileStateMap: { [KEY]: { field: 'recency' } },
      stateTypes: [ProfileStateType.Persistent],
      defaultsHandling: 'expand',
    });

    expect(expanded).toEqual({ [KEY]: { field: 'recency', direction: 'asc' } });
  });

  it('strips an all-default sort on read so it falls back to the default', () => {
    const registry = createRegistry();

    const stripped = registry.pickStateByType({
      profileStateMap: { [KEY]: { field: 'alphabetically', direction: 'asc' } },
      stateTypes: [ProfileStateType.Persistent],
      defaultsHandling: 'strip',
    });

    expect(stripped[KEY]).toBeUndefined();
  });

  it('preserves a non-default sort on read (reload persistence)', () => {
    const registry = createRegistry();

    const stripped = registry.pickStateByType({
      profileStateMap: { [KEY]: { field: 'recency', direction: 'desc' } },
      stateTypes: [ProfileStateType.Persistent],
      defaultsHandling: 'strip',
    });

    expect(stripped).toEqual({ [KEY]: { field: 'recency', direction: 'desc' } });
  });

  it('stays in sync with the viewer DEFAULT_METRICS_SORT (drift guard)', () => {
    expect([METRICS_GRID_SORT_DEFAULTS.field, METRICS_GRID_SORT_DEFAULTS.direction]).toEqual([
      ...DEFAULT_METRICS_SORT,
    ]);
  });
});
