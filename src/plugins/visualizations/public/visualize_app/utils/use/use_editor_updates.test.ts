/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { EventEmitter } from 'events';

import { useEditorUpdates } from './use_editor_updates';
import { VisualizeServices, VisualizeAppStateContainer, SavedVisInstance } from '../../types';
import type { IEditorController } from '../../types';
import { visualizeAppStateStub } from '../stubs';
import { createVisualizeServicesMock } from '../mocks';

jest.mock('../../../utils/saved_visualize_utils', () => {
  const stubs = jest.requireActual('../stubs');
  return { convertFromSerializedVis: () => ({ visState: stubs.visualizeAppStateStub.vis }) };
});

describe('useEditorUpdates', () => {
  const eventEmitter = new EventEmitter();
  const setHasUnsavedChangesMock = jest.fn();
  let mockServices: jest.Mocked<VisualizeServices>;

  beforeEach(() => {
    mockServices = createVisualizeServicesMock();
  });

  test('should not create any subscriptions if app state container is not ready', () => {
    const { result } = renderHook(() =>
      useEditorUpdates(
        mockServices,
        eventEmitter,
        setHasUnsavedChangesMock,
        null,
        undefined,
        undefined
      )
    );

    expect(result.current).toEqual({
      isEmbeddableRendered: false,
      currentAppState: undefined,
    });
  });

  let unsubscribeStateUpdatesMock: jest.Mock;
  let appState: VisualizeAppStateContainer;
  let savedVisInstance: SavedVisInstance;
  let visEditorController: IEditorController;
  let timeRange: any;
  let mockFilters: any;

  beforeEach(() => {
    unsubscribeStateUpdatesMock = jest.fn();
    appState = {
      getState: jest.fn(() => visualizeAppStateStub),
      subscribe: jest.fn(() => unsubscribeStateUpdatesMock),
      transitions: {
        set: jest.fn(),
      },
    } as unknown as VisualizeAppStateContainer;
    savedVisInstance = {
      vis: {
        uiState: {
          on: jest.fn(),
          off: jest.fn(),
          setSilent: jest.fn(),
          getChanges: jest.fn(() => visualizeAppStateStub.uiState),
        },
        data: {},
        serialize: jest.fn(),
        title: visualizeAppStateStub.vis.title,
        setState: jest.fn(),
      },
      embeddableHandler: {
        updateInput: jest.fn(),
        reload: jest.fn(),
      },
      savedVis: {},
    } as unknown as SavedVisInstance;
    visEditorController = {
      render: jest.fn(),
      destroy: jest.fn(),
    };
    timeRange = {
      from: 'now-15m',
      to: 'now',
    };
    mockFilters = ['mockFilters'];
    const mockQuery = {
      query: '',
      language: 'kuery',
    };
    // @ts-expect-error
    mockServices.data.query.timefilter.timefilter.getTime.mockImplementation(() => timeRange);
    // @ts-expect-error
    mockServices.data.query.filterManager.getFilters.mockImplementation(() => mockFilters);
    // @ts-expect-error
    mockServices.data.query.queryString.getQuery.mockImplementation(() => mockQuery);
  });

  test('should set up current app state and render the editor', () => {
    const { result } = renderHook(() =>
      useEditorUpdates(
        mockServices,
        eventEmitter,
        setHasUnsavedChangesMock,
        appState,
        savedVisInstance,
        visEditorController
      )
    );

    expect(result.current).toEqual({
      isEmbeddableRendered: false,
      currentAppState: visualizeAppStateStub,
    });
    expect(savedVisInstance.vis.uiState.setSilent).toHaveBeenCalledWith(
      visualizeAppStateStub.uiState
    );
    expect(visEditorController.render).toHaveBeenCalledWith({
      core: mockServices,
      data: mockServices.data,
      uiState: savedVisInstance.vis.uiState,
      timeRange,
      filters: mockFilters,
      query: visualizeAppStateStub.query,
      linked: false,
      savedSearch: undefined,
    });
  });

  test('should update embeddable handler in embeded mode', () => {
    renderHook(() =>
      useEditorUpdates(
        mockServices,
        eventEmitter,
        setHasUnsavedChangesMock,
        appState,
        savedVisInstance,
        undefined
      )
    );

    expect(savedVisInstance.embeddableHandler.updateInput).toHaveBeenCalledWith({
      timeRange,
      filters: mockFilters,
      query: visualizeAppStateStub.query,
    });
  });

  test('should update isEmbeddableRendered value when embedabble is rendered', () => {
    const { result } = renderHook(() =>
      useEditorUpdates(
        mockServices,
        eventEmitter,
        setHasUnsavedChangesMock,
        appState,
        savedVisInstance,
        undefined
      )
    );

    act(() => {
      eventEmitter.emit('embeddableRendered');
    });

    expect(result.current.isEmbeddableRendered).toBe(true);
  });

  test('should destroy subscriptions on unmount', () => {
    const { unmount } = renderHook(() =>
      useEditorUpdates(
        mockServices,
        eventEmitter,
        setHasUnsavedChangesMock,
        appState,
        savedVisInstance,
        undefined
      )
    );

    unmount();

    expect(unsubscribeStateUpdatesMock).toHaveBeenCalledTimes(1);
    expect(savedVisInstance.vis.uiState.off).toHaveBeenCalledTimes(1);
  });

  describe('subscribe on app state updates', () => {
    test('should subscribe on appState updates', () => {
      const { result } = renderHook(() =>
        useEditorUpdates(
          mockServices,
          eventEmitter,
          setHasUnsavedChangesMock,
          appState,
          savedVisInstance,
          undefined
        )
      );
      // @ts-expect-error
      const listener = appState.subscribe.mock.calls[0][0];

      act(() => {
        listener(visualizeAppStateStub);
      });

      expect(result.current.currentAppState).toEqual(visualizeAppStateStub);
      expect(setHasUnsavedChangesMock).toHaveBeenCalledWith(true);
      expect(savedVisInstance.embeddableHandler.updateInput).toHaveBeenCalledTimes(2);
    });

    test('should update vis state and reload the editor if changes come from url', () => {
      const { result } = renderHook(() =>
        useEditorUpdates(
          mockServices,
          eventEmitter,
          setHasUnsavedChangesMock,
          appState,
          savedVisInstance,
          undefined
        )
      );
      // @ts-expect-error
      const listener = appState.subscribe.mock.calls[0][0];
      const newAppState = {
        ...visualizeAppStateStub,
        vis: {
          ...visualizeAppStateStub.vis,
          title: 'New title',
        },
      };
      const { aggs, ...visState } = newAppState.vis;
      const updateEditorSpy = jest.fn();

      eventEmitter.on('updateEditor', updateEditorSpy);

      act(() => {
        listener(newAppState);
      });

      expect(result.current.currentAppState).toEqual(newAppState);
      expect(savedVisInstance.vis.setState).toHaveBeenCalledWith({
        ...visState,
        data: { aggs },
      });
      expect(savedVisInstance.embeddableHandler.reload).toHaveBeenCalled();
      expect(updateEditorSpy).toHaveBeenCalled();
    });

    describe('handle linked search changes', () => {
      test('should update saved search id in saved instance', () => {
        // @ts-expect-error 4.3.5 upgrade
        savedVisInstance.savedSearch = {
          id: 'saved_search_id',
        };

        renderHook(() =>
          useEditorUpdates(
            mockServices,
            eventEmitter,
            setHasUnsavedChangesMock,
            appState,
            savedVisInstance,
            undefined
          )
        );
        // @ts-expect-error
        const listener = appState.subscribe.mock.calls[0][0];

        act(() => {
          listener({
            ...visualizeAppStateStub,
            linked: true,
          });
        });

        expect(savedVisInstance.savedVis.savedSearchId).toEqual('saved_search_id');
        expect(savedVisInstance.vis.data.savedSearchId).toEqual('saved_search_id');
      });

      test('should remove saved search id from vis instance', () => {
        // @ts-expect-error
        savedVisInstance.savedVis = {
          savedSearchId: 'saved_search_id',
        };

        // @ts-expect-error 4.3.5 upgrade
        savedVisInstance.savedSearch = {
          id: 'saved_search_id',
        };
        savedVisInstance.vis.data.savedSearchId = 'saved_search_id';

        renderHook(() =>
          useEditorUpdates(
            mockServices,
            eventEmitter,
            setHasUnsavedChangesMock,
            appState,
            savedVisInstance,
            undefined
          )
        );
        // @ts-expect-error
        const listener = appState.subscribe.mock.calls[0][0];

        act(() => {
          listener(visualizeAppStateStub);
        });

        expect(savedVisInstance.savedVis.savedSearchId).toBeUndefined();
        expect(savedVisInstance.vis.data.savedSearchId).toBeUndefined();
      });
    });
  });
});
