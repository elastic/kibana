/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  LOCALLY_PERSISTED_PROFILE_STATE_TYPES,
  ProfileStateRegistry,
  ProfileStateType,
} from '../profile_state';
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

  it('types sort as Url and grid settings as Persistent', () => {
    expect(METRICS_STATE_DEF.descriptor).toEqual({
      counterAggregation: { type: ProfileStateType.Persistent },
      gaugeAggregation: { type: ProfileStateType.Persistent },
      histogramPercentile: { type: ProfileStateType.Persistent },
      sortField: { type: ProfileStateType.Url },
      sortDirection: { type: ProfileStateType.Url },
    });
  });

  it('fills in defaults when expanding a partial sort (what the host writes to the URL)', () => {
    const registry = createRegistry();

    const expanded = registry.pickStateByType({
      profileStateMap: { [KEY]: { sortField: 'recency' } },
      stateTypes: [ProfileStateType.Url],
      defaultsHandling: 'expand',
    });

    // The sibling default is filled in so a shared link is self-contained.
    expect(expanded[KEY]).toEqual({ sortField: 'recency', sortDirection: 'asc' });
  });

  it('strips an all-default sort so it does not reach the URL', () => {
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
      stateTypes: [ProfileStateType.Url],
      defaultsHandling: 'strip',
    });

    expect(stripped[KEY]).toBeUndefined();
  });

  it('preserves a non-default sort so it reaches the URL', () => {
    const registry = createRegistry();

    const stripped = registry.pickStateByType({
      profileStateMap: { [KEY]: { sortField: 'recency', sortDirection: 'desc' } },
      stateTypes: [ProfileStateType.Url],
      defaultsHandling: 'strip',
    });

    expect(stripped).toEqual({ [KEY]: { sortField: 'recency', sortDirection: 'desc' } });
  });

  it('keeps non-default grid settings out of URL state', () => {
    const registry = createRegistry();

    const urlState = registry.pickStateByType({
      profileStateMap: { [KEY]: { counterAggregation: 'max', sortField: 'recency' } },
      stateTypes: [ProfileStateType.Url],
      defaultsHandling: 'strip',
    });

    expect(urlState).toEqual({ [KEY]: { sortField: 'recency' } });
  });

  it('still exposes sort to locally persisted state types (reload persistence)', () => {
    const registry = createRegistry();

    const stripped = registry.pickStateByType({
      profileStateMap: { [KEY]: { counterAggregation: 'max', sortField: 'recency' } },
      stateTypes: LOCALLY_PERSISTED_PROFILE_STATE_TYPES,
      defaultsHandling: 'strip',
    });

    expect(stripped).toEqual({ [KEY]: { counterAggregation: 'max', sortField: 'recency' } });
  });
});
