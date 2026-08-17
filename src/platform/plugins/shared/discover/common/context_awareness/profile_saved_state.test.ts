/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { DiscoverTabType } from '@kbn/discover-utils';
import type { DiscoverSessionTabTypeState } from '@kbn/saved-search-plugin/common';
import { ProfileStateType } from './profile_state';
import {
  ProfileSavedStateRegistry,
  createProfileSavedStateTransform,
  type ProfileSavedStateTransform,
  type TabTypeStateMap,
} from './profile_saved_state';
import { METRICS_GRID_SAVED_STATE_TRANSFORM } from './profile_saved_state_transforms/metrics_grid_saved_state_transform';

/**
 * Shared helper: every transform's saved payload must round-trip through both directions,
 * i.e. `toSavedState(fromSavedState(x))` is stable. Generic so future transforms get this
 * check for free.
 */
const expectRoundTripStable = <
  TTabType extends DiscoverTabType.Metrics,
  TState extends SerializableRecord,
  TField extends keyof TabTypeStateMap[TTabType]
>(
  transform: ProfileSavedStateTransform<TTabType, TState, TField>,
  savedFixture: Pick<Record<TField, unknown>, TField>
) => {
  const registry = new ProfileSavedStateRegistry();
  registry.registerTransform(transform);

  // The generic fixture's exact shape isn't known to line up with the real discriminated
  // union member for `transform.tabType` -- this helper is generic specifically so future
  // transforms get the same round-trip check without writing it themselves.
  const savedTabTypeState = {
    type: transform.tabType,
    ...savedFixture,
  } as unknown as DiscoverSessionTabTypeState;

  const profileStateMap = registry.fromSavedState(savedTabTypeState);
  const roundTripped = registry.toSavedState(transform.tabType, profileStateMap);

  expect(roundTripped).toEqual({ type: transform.tabType, ...savedFixture });
};

describe('ProfileSavedStateRegistry', () => {
  describe('registerTransform', () => {
    // The `metrics` tab type currently has a single saved field (`dimensions`), so this is
    // the only field two transforms can genuinely collide over today. A test exercising two
    // transforms contributing *disjoint* fields under one tab type needs a second real field
    // to type-check honestly -- add one alongside the next transform that needs it.
    it('rejects a transform claiming a field already claimed under the same tab type', () => {
      const registry = new ProfileSavedStateRegistry();
      registry.registerTransform(METRICS_GRID_SAVED_STATE_TRANSFORM);

      const duplicateTransform = createProfileSavedStateTransform({
        tabType: DiscoverTabType.Metrics,
        stateDefinition: {
          key: 'duplicateDimensionsState',
          descriptor: { dimensions: { type: ProfileStateType.Persistent } },
          defaultState: { dimensions: [] as string[] },
        },
        savedFields: ['dimensions'] as const,
        toSavedState: ({ dimensions }) => ({ dimensions }),
        fromSavedState: ({ dimensions }) => ({ dimensions }),
      });

      expect(() => registry.registerTransform(duplicateTransform)).toThrowError(
        'Field "dimensions" of tab type "metrics" is already claimed by another transform.'
      );
    });
  });

  describe('toSavedState', () => {
    it('returns undefined when tabType is undefined', () => {
      const registry = new ProfileSavedStateRegistry();
      registry.registerTransform(METRICS_GRID_SAVED_STATE_TRANSFORM);

      expect(registry.toSavedState(undefined, {})).toBeUndefined();
    });

    it('returns just { type } when no transform is registered for the tab type', () => {
      const registry = new ProfileSavedStateRegistry();

      expect(registry.toSavedState(DiscoverTabType.Metrics, {})).toEqual({
        type: DiscoverTabType.Metrics,
      });
    });

    it('expands defaults, writing every contributing value even when nothing was explicitly set', () => {
      const registry = new ProfileSavedStateRegistry();
      registry.registerTransform(METRICS_GRID_SAVED_STATE_TRANSFORM);

      expect(registry.toSavedState(DiscoverTabType.Metrics, {})).toEqual({
        type: DiscoverTabType.Metrics,
        dimensions: [],
      });
    });

    it('does not alter what an already-saved session displays when defaultState changes later', () => {
      const registry = new ProfileSavedStateRegistry();
      registry.registerTransform(METRICS_GRID_SAVED_STATE_TRANSFORM);

      // A session saved with an explicit, non-default value...
      const savedState = registry.toSavedState(DiscoverTabType.Metrics, {
        metricsState: { dimensions: ['host.name'] },
      });

      // ...is unaffected by what METRICS_GRID_SETTINGS_DEFAULTS.dimensions becomes later,
      // because toSavedState only ever reads the *current* default to fill in unset fields,
      // never to override an explicit one.
      expect(savedState).toEqual({ type: DiscoverTabType.Metrics, dimensions: ['host.name'] });
    });
  });

  describe('fromSavedState', () => {
    it('returns an empty map when tabTypeState is undefined', () => {
      const registry = new ProfileSavedStateRegistry();
      registry.registerTransform(METRICS_GRID_SAVED_STATE_TRANSFORM);

      expect(registry.fromSavedState(undefined)).toEqual({});
    });

    it('returns an empty map when no transform is registered for the saved type', () => {
      const registry = new ProfileSavedStateRegistry();

      expect(
        registry.fromSavedState({ type: DiscoverTabType.Metrics, dimensions: ['host.name'] })
      ).toEqual({});
    });

    it('keys the result by the contributing transform state definition key', () => {
      const registry = new ProfileSavedStateRegistry();
      registry.registerTransform(METRICS_GRID_SAVED_STATE_TRANSFORM);

      expect(
        registry.fromSavedState({ type: DiscoverTabType.Metrics, dimensions: ['host.name'] })
      ).toEqual({
        metricsState: { dimensions: ['host.name'] },
      });
    });
  });

  describe('round-trip stability', () => {
    it('METRICS_GRID_SAVED_STATE_TRANSFORM is stable', () => {
      expectRoundTripStable(METRICS_GRID_SAVED_STATE_TRANSFORM, {
        dimensions: ['host.name', 'service.name'],
      });
    });
  });
});
