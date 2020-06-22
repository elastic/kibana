/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { renderHook } from '@testing-library/react-hooks';
import { EventEmitter } from 'events';

import { useLinkedSearchUpdates } from './use_linked_search_updates';
import { VisualizeServices, SavedVisInstance, VisualizeAppStateContainer } from '../../types';
import { createVisualizeServicesMock } from '../mocks';

describe('useLinkedSearchUpdates', () => {
  let mockServices: jest.Mocked<VisualizeServices>;
  const eventEmitter = new EventEmitter();
  const savedVisInstance = ({
    vis: {
      data: {
        searchSource: { setField: jest.fn(), setParent: jest.fn() },
      },
    },
    savedVis: {},
    embeddableHandler: {},
  } as unknown) as SavedVisInstance;

  beforeEach(() => {
    mockServices = createVisualizeServicesMock();
  });

  it('should not subscribe on unlinkFromSavedSearch event if appState or savedSearch are not defined', () => {
    renderHook(() => useLinkedSearchUpdates(mockServices, eventEmitter, null, savedVisInstance));

    expect(mockServices.toastNotifications.addSuccess).not.toHaveBeenCalled();
  });

  it('should subscribe on unlinkFromSavedSearch event if vis is based on saved search', () => {
    const mockAppState = ({
      transitions: {
        unlinkSavedSearch: jest.fn(),
      },
    } as unknown) as VisualizeAppStateContainer;
    savedVisInstance.savedSearch = ({
      searchSource: {
        getParent: jest.fn(),
        getField: jest.fn(),
        getOwnField: jest.fn(),
      },
      title: 'savedSearch',
    } as unknown) as SavedVisInstance['savedSearch'];

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
