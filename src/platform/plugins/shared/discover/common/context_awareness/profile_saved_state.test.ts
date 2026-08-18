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

      const savedState = registry.toSavedState(DiscoverTabType.Metrics, {
        metricsState: { dimensions: ['host.name'] },
      });

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
