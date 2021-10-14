/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { EventEmitter } from 'events';

import { useLinkedSearchUpdates } from './use_linked_search_updates';
import { VisualizeServices, SavedVisInstance, VisualizeAppStateContainer } from '../../types';
import { createVisualizeServicesMock } from '../mocks';

describe('useLinkedSearchUpdates', () => {
  let mockServices: jest.Mocked<VisualizeServices>;
  const eventEmitter = new EventEmitter();
  const savedVisInstance = {
    vis: {
      data: {
        searchSource: { setField: jest.fn(), setParent: jest.fn() },
      },
    },
    savedVis: {},
    embeddableHandler: {},
  } as unknown as SavedVisInstance;

  beforeEach(() => {
    mockServices = createVisualizeServicesMock();
  });

  it('should not subscribe on unlinkFromSavedSearch event if appState or savedSearch are not defined', () => {
    renderHook(() => useLinkedSearchUpdates(mockServices, eventEmitter, null, savedVisInstance));

    expect(mockServices.toastNotifications.addSuccess).not.toHaveBeenCalled();
  });

  it('should subscribe on unlinkFromSavedSearch event if vis is based on saved search', () => {
    const mockAppState = {
      transitions: {
        unlinkSavedSearch: jest.fn(),
      },
    } as unknown as VisualizeAppStateContainer;
    savedVisInstance.savedSearch = {
      searchSource: {
        getParent: jest.fn(),
        getField: jest.fn(),
        getOwnField: jest.fn(),
      },
      title: 'savedSearch',
    } as unknown as SavedVisInstance['savedSearch'];

    renderHook(() =>
      useLinkedSearchUpdates(mockServices, eventEmitter, mockAppState, savedVisInstance)
    );

    eventEmitter.emit('unlinkFromSavedSearch');

    expect(savedVisInstance.savedSearch?.searchSource?.getParent).toHaveBeenCalled();
    expect(savedVisInstance.savedSearch?.searchSource?.getField).toHaveBeenCalledWith('index');
    expect(mockAppState.transitions.unlinkSavedSearch).toHaveBeenCalled();
    expect(mockServices.toastNotifications.addSuccess).toHaveBeenCalled();
  });
});
