/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { EventEmitter } from 'events';
import { Observable } from 'rxjs';

import { useVisualizeAppState } from './use_visualize_app_state';
import { VisualizeServices, SavedVisInstance } from '../../types';
import { visualizeAppStateStub } from '../stubs';
import { VisualizeConstants } from '../../../../common/constants';
import { createVisualizeServicesMock } from '../mocks';

jest.mock('../utils');
jest.mock('../create_visualize_app_state');
jest.mock('../../../../../data/public');

describe('useVisualizeAppState', () => {
  const { visStateToEditorState } = jest.requireMock('../utils');
  const { createVisualizeAppState } = jest.requireMock('../create_visualize_app_state');
  const { connectToQueryState } = jest.requireMock('../../../../../data/public');
  const stopStateSyncMock = jest.fn();
  const stateContainerGetStateMock = jest.fn(() => visualizeAppStateStub);
  const stopSyncingAppFiltersMock = jest.fn();
  const stateContainer = {
    getState: stateContainerGetStateMock,
    state$: new Observable(),
    transitions: {
      updateVisState: jest.fn(),
      set: jest.fn(),
    },
  };

  visStateToEditorState.mockImplementation(() => visualizeAppStateStub);
  createVisualizeAppState.mockImplementation(() => ({
    stateContainer,
    stopStateSync: stopStateSyncMock,
  }));
  connectToQueryState.mockImplementation(() => stopSyncingAppFiltersMock);

  const eventEmitter = new EventEmitter();
  const savedVisInstance = {
    vis: {
      setState: jest.fn().mockResolvedValue({}),
      data: {},
    },
    savedVis: {},
    embeddableHandler: {},
  } as unknown as SavedVisInstance;
  let mockServices: jest.Mocked<VisualizeServices>;

  beforeEach(() => {
    mockServices = createVisualizeServicesMock();

    stopStateSyncMock.mockClear();
    stopSyncingAppFiltersMock.mockClear();
    visStateToEditorState.mockClear();
  });

  it("should not create appState if vis instance isn't ready", () => {
    const { result } = renderHook(() => useVisualizeAppState(mockServices, eventEmitter));

    expect(result.current).toEqual({
      appState: null,
      hasUnappliedChanges: false,
    });
  });

  it('should create appState and connect it to query search params', () => {
    const { result } = renderHook(() =>
      useVisualizeAppState(mockServices, eventEmitter, savedVisInstance)
    );

    expect(visStateToEditorState).toHaveBeenCalledWith(savedVisInstance, mockServices);
    expect(createVisualizeAppState).toHaveBeenCalledWith({
      stateDefaults: visualizeAppStateStub,
      kbnUrlStateStorage: undefined,
      byValue: false,
    });
    expect(mockServices.data.query.filterManager.setAppFilters).toHaveBeenCalledWith(
      visualizeAppStateStub.filters
    );
    expect(connectToQueryState).toHaveBeenCalledWith(mockServices.data.query, expect.any(Object), {
      filters: 'appState',
      query: true,
    });
    expect(result.current).toEqual({
      appState: stateContainer,
      hasUnappliedChanges: false,
    });
  });

  it('should stop state and app filters syncing with query on destroy', () => {
    const { unmount } = renderHook(() =>
      useVisualizeAppState(mockServices, eventEmitter, savedVisInstance)
    );

    unmount();

    expect(stopStateSyncMock).toBeCalledTimes(1);
    expect(stopSyncingAppFiltersMock).toBeCalledTimes(1);
  });

  it('should be subscribed on dirtyStateChange event from an editor', () => {
    const { result } = renderHook(() =>
      useVisualizeAppState(mockServices, eventEmitter, savedVisInstance)
    );

    act(() => {
      eventEmitter.emit('dirtyStateChange', { isDirty: true });
    });

    expect(result.current.hasUnappliedChanges).toEqual(true);
    expect(stateContainer.transitions.updateVisState).not.toHaveBeenCalled();
    expect(visStateToEditorState).toHaveBeenCalledTimes(1);

    act(() => {
      eventEmitter.emit('dirtyStateChange', { isDirty: false });
    });

    expect(result.current.hasUnappliedChanges).toEqual(false);
    expect(stateContainer.transitions.updateVisState).toHaveBeenCalledWith(
      visualizeAppStateStub.vis
    );
    expect(visStateToEditorState).toHaveBeenCalledTimes(2);
  });

  describe('update vis state if the url params are not equal with the saved object vis state', () => {
    const newAgg = {
      id: '2',
      enabled: true,
      type: 'terms',
      schema: 'group',
      params: {
        field: 'total_quantity',
        orderBy: '1',
        order: 'desc',
        size: 5,
        otherBucket: false,
        otherBucketLabel: 'Other',
        missingBucket: false,
        missingBucketLabel: 'Missing',
        customLabel: '',
      },
    };
    const state = {
      ...visualizeAppStateStub,
      vis: {
        ...visualizeAppStateStub.vis,
        aggs: [...visualizeAppStateStub.vis.aggs, newAgg],
      },
    };

    it('should successfully update vis state and set up app state container', async () => {
      stateContainerGetStateMock.mockImplementation(() => state);
      const { result, waitForNextUpdate } = renderHook(() =>
        useVisualizeAppState(mockServices, eventEmitter, savedVisInstance)
      );

      await waitForNextUpdate();

      const { aggs, ...visState } = stateContainer.getState().vis;
      const expectedNewVisState = {
        ...visState,
        data: { aggs: state.vis.aggs, searchSource: { query: state.query, filter: state.filters } },
      };

      expect(savedVisInstance.vis.setState).toHaveBeenCalledWith(expectedNewVisState);
      expect(result.current).toEqual({
        appState: stateContainer,
        hasUnappliedChanges: false,
      });
    });

    it('should successfully updated vis state and set up app state container if query from app state is different', async () => {
      stateContainerGetStateMock.mockImplementation(() => ({
        ...visualizeAppStateStub,
        query: { query: 'test', language: 'kuery' },
      }));
      const { result, waitForNextUpdate } = renderHook(() =>
        useVisualizeAppState(mockServices, eventEmitter, savedVisInstance)
      );

      await waitForNextUpdate();

      const { aggs, ...visState } = stateContainer.getState().vis;
      const expectedNewVisState = {
        ...visState,
        data: { aggs: state.vis.aggs, searchSource: { query: state.query, filter: state.filters } },
      };

      expect(savedVisInstance.vis.setState).toHaveBeenCalledWith(expectedNewVisState);
      expect(result.current).toEqual({
        appState: stateContainer,
        hasUnappliedChanges: false,
      });
    });

    it(`should add warning toast and redirect to the landing page
        if setting new vis state was not successful, e.x. invalid query params`, async () => {
      stateContainerGetStateMock.mockImplementation(() => state);
      // @ts-expect-error
      savedVisInstance.vis.setState.mockRejectedValue({
        message: 'error',
      });

      renderHook(() => useVisualizeAppState(mockServices, eventEmitter, savedVisInstance));

      await new Promise<void>((res) => {
        setTimeout(() => res());
      });

      expect(mockServices.toastNotifications.addWarning).toHaveBeenCalled();
      expect(mockServices.history.replace).toHaveBeenCalledWith(
        `${VisualizeConstants.LANDING_PAGE_PATH}?notFound=visualization`
      );
    });
  });
});
