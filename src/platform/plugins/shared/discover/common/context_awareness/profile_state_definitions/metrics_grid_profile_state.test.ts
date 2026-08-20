/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ProfileStateRegistry, ProfileStateType } from '../profile_state';
import { METRICS_STATE_DEF } from './metrics_grid_profile_state';

const KEY = METRICS_STATE_DEF.key;

const createRegistry = () => {
  const registry = new ProfileStateRegistry();
  registry.registerDefinition(METRICS_STATE_DEF);
  return registry;
};

describe('METRICS_STATE_DEF', () => {
  it('registers the definition', () => {
    const registry = createRegistry();

    expect(registry.hasDefinition(METRICS_STATE_DEF)).toBe(true);
    // The key is a storage contract: it is persisted inside users' local tab
    // storage with no migration path, so renaming it orphans persisted state.
    expect(METRICS_STATE_DEF.key).toBe('metricsState');
  });

  it('types all fields as Persistent so the host persists them locally across reloads', () => {
    expect(METRICS_STATE_DEF.descriptor).toEqual({
      counterAggregation: { type: ProfileStateType.Persistent },
      gaugeAggregation: { type: ProfileStateType.Persistent },
      histogramPercentile: { type: ProfileStateType.Persistent },
      sortField: { type: ProfileStateType.Persistent },
      sortDirection: { type: ProfileStateType.Persistent },
    });
  });

  it('fills in defaults when expanding a partial sort (what the host writes to storage)', () => {
    const registry = createRegistry();

    const expanded = registry.pickStateByType({
      profileStateMap: { [KEY]: { sortField: 'recency' } },
      stateTypes: [ProfileStateType.Persistent],
      defaultsHandling: 'expand',
    });

    expect(expanded[KEY]).toMatchObject({ sortField: 'recency', sortDirection: 'asc' });
  });

  it('strips an all-default sort on read so it falls back to the default', () => {
    const registry = createRegistry();

    const stripped = registry.pickStateByType({
      profileStateMap: {
        [KEY]: {
          counterAggregation: 'sum',
          gaugeAggregation: 'avg',
          histogramPercentile: 'p95',
          sortField: 'alphabetically',
          sortDirection: 'asc',
        },
      },
      stateTypes: [ProfileStateType.Persistent],
      defaultsHandling: 'strip',
    });

    expect(stripped[KEY]).toBeUndefined();
  });

  it('preserves a non-default sort on read (reload persistence)', () => {
    const registry = createRegistry();

    const stripped = registry.pickStateByType({
      profileStateMap: { [KEY]: { sortField: 'recency', sortDirection: 'desc' } },
      stateTypes: [ProfileStateType.Persistent],
      defaultsHandling: 'strip',
    });

    expect(stripped).toEqual({ [KEY]: { sortField: 'recency', sortDirection: 'desc' } });
  });
});
