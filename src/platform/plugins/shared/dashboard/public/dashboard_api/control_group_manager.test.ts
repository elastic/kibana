/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { initializeControlGroupManager } from './control_group_manager';
import type { ControlGroupApi } from '@kbn/controls-plugin/public';
import type { ControlsGroupState } from '@kbn/controls-schemas';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { take } from 'rxjs';

describe('initializeControlGroupManager', () => {
  const getReferences = jest.fn().mockReturnValue([]);

  beforeEach(() => {
    getReferences.mockClear();
  });

  describe('get state for control group', () => {
    it('should return default state when no initial state is provided', () => {
      const { internalApi } = initializeControlGroupManager(undefined, getReferences, 'view');
      const state = internalApi.getStateForControlGroup();
      expect(state.rawState).toBeDefined();
      expect(state.rawState.controls).toEqual([]);
      expect(state.references).toEqual([]);
      expect(getReferences).toHaveBeenCalledWith('CONTROL_GROUP_EMBEDDABLE_ID');
    });

    it('should return initial state when provided', () => {
      const initialState: ControlsGroupState = {
        autoApplySelections: false,
        chainingSystem: 'NONE',
        controls: [{ id: '1', order: 0, type: 'optionsList' }],
        ignoreParentSettings: {
          ignoreFilters: true,
          ignoreQuery: true,
          ignoreTimerange: true,
          ignoreValidations: true,
        },
        labelPosition: 'oneLine',
      };
      const { internalApi } = initializeControlGroupManager(initialState, getReferences, 'view');
      const state = internalApi.getStateForControlGroup();
      expect(state.rawState).toEqual(initialState);
    });
  });

  describe('initialization', () => {
    it('isFetchPaused$ should emit false before the control group is set when the Dashboard is in print mode.', async () => {
      const { api } = initializeControlGroupManager(undefined, getReferences, 'print');
      const firstEmit = await firstValueFrom(api.isFetchPaused$);
      expect(firstEmit).toBe(true);

      const lastEmitPromise = lastValueFrom(api.isFetchPaused$.pipe(take(2)));
      const lastEmit = await lastEmitPromise;
      expect(lastEmit).toBe(false);
    });

    it('isFetchPaused$ should emit true initially, then false after controls are initialized', async () => {
      const { api, internalApi } = initializeControlGroupManager(undefined, getReferences, 'view');
      const mockControlGroupApi = {
        untilFiltersPublished: jest.fn().mockResolvedValue(undefined),
      } as unknown as ControlGroupApi;

      const firstEmit = await firstValueFrom(api.isFetchPaused$);
      expect(firstEmit).toBe(true);

      const lastEmitPromise = lastValueFrom(api.isFetchPaused$.pipe(take(2)));
      internalApi.setControlGroupApi(mockControlGroupApi);

      const lastEmit = await lastEmitPromise;
      expect(lastEmit).toBe(false);
    });

    it('should publish controlGroupApi when it becomes available', async () => {
      const { api, internalApi } = initializeControlGroupManager(undefined, getReferences, 'view');
      const mockControlGroupApi = {
        untilFiltersPublished: jest.fn().mockResolvedValue(undefined),
      } as unknown as ControlGroupApi;

      const controlGroupPromise = lastValueFrom(api.controlGroupApi$.pipe(take(2)));
      internalApi.setControlGroupApi(mockControlGroupApi);

      const controlGroupApi = await controlGroupPromise;
      expect(controlGroupApi).toBe(mockControlGroupApi);
      expect(api.controlGroupApi$.value).toBe(mockControlGroupApi);
    });
  });

  describe('serialize control group state', () => {
    it('should serialize control group state', () => {
      const { internalApi } = initializeControlGroupManager(undefined, getReferences, 'view');
      const mockSerializedState = {
        rawState: { controls: [{ id: '1' }] },
        references: [{ id: 'ref1', name: 'refName' }],
      };
      const mockControlGroupApi = {
        serializeState: jest.fn().mockReturnValue(mockSerializedState),
        untilFiltersPublished: jest.fn().mockResolvedValue(undefined),
      } as unknown as ControlGroupApi;

      internalApi.setControlGroupApi(mockControlGroupApi);
      const serialized = internalApi.serializeControlGroup();

      expect(mockControlGroupApi.serializeState).toHaveBeenCalled();
      expect(serialized.controlGroupInput).toEqual(mockSerializedState.rawState);
      expect(serialized.controlGroupReferences).toEqual(mockSerializedState.references);
    });

    it('should return empty state when serializing with no control group api', () => {
      const { internalApi } = initializeControlGroupManager(undefined, getReferences, 'view');
      const serialized = internalApi.serializeControlGroup();
      expect(serialized.controlGroupInput).toBeUndefined();
      expect(serialized.controlGroupReferences).toEqual([]);
    });
  });
});
