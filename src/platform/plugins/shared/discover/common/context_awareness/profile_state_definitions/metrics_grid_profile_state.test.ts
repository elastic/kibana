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

  it('types all fields as Url so they can be bookmarked and shared', () => {
    expect(METRICS_STATE_DEF.descriptor).toEqual({
      counterAggregation: { type: ProfileStateType.Url },
      gaugeAggregation: { type: ProfileStateType.Url },
      histogramPercentile: { type: ProfileStateType.Url },
      sortField: { type: ProfileStateType.Url },
      sortDirection: { type: ProfileStateType.Url },
      dimensions: { type: ProfileStateType.Url },
      searchTerm: { type: ProfileStateType.Url },
    });
  });

  it('fills in sibling Url defaults when expanding a partial state (what the host writes to the URL)', () => {
    const registry = createRegistry();

    const expanded = registry.pickStateByType({
      profileStateMap: { [KEY]: { counterAggregation: 'max' } },
      stateTypes: [ProfileStateType.Url],
      defaultsHandling: 'expand',
    });

    // Sibling defaults are filled in so a shared link is self-contained.
    expect(expanded[KEY]).toEqual({
      counterAggregation: 'max',
      gaugeAggregation: 'avg',
      histogramPercentile: 'p95',
      sortField: 'alphabetically',
      sortDirection: 'asc',
      dimensions: [],
      searchTerm: '',
    });
  });

  it('strips an all-default state so it does not reach the URL', () => {
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

  it('preserves a non-default grid setting so it reaches the URL', () => {
    const registry = createRegistry();

    const stripped = registry.pickStateByType({
      profileStateMap: { [KEY]: { counterAggregation: 'max' } },
      stateTypes: [ProfileStateType.Url],
      defaultsHandling: 'strip',
    });

    expect(stripped).toEqual({ [KEY]: { counterAggregation: 'max' } });
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

  it('still exposes Url fields to locally persisted state types (reload persistence)', () => {
    const registry = createRegistry();

    const stripped = registry.pickStateByType({
      profileStateMap: { [KEY]: { counterAggregation: 'max', sortField: 'recency' } },
      stateTypes: LOCALLY_PERSISTED_PROFILE_STATE_TYPES,
      defaultsHandling: 'strip',
    });

    expect(stripped).toEqual({ [KEY]: { counterAggregation: 'max', sortField: 'recency' } });
  });
});
