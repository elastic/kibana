/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as savedObjectsPlugin from '@kbn/saved-objects-plugin/public';
jest.mock('@kbn/saved-objects-plugin/public');
import type { DataView } from '@kbn/data-views-plugin/common';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { onSaveSearch } from './on_save_search';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { getDiscoverStateContainer } from '../../state_management/discover_state';
import { ReactElement } from 'react';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { createBrowserHistory } from 'history';
import { mockCustomizationContext } from '../../../../customizations/__mocks__/customization_context';

function getStateContainer({ dataView }: { dataView?: DataView } = {}) {
  const savedSearch = savedSearchMock;
  const history = createBrowserHistory();
  const stateContainer = getDiscoverStateContainer({
    services: discoverServiceMock,
    history,
    customizationContext: mockCustomizationContext,
  });
  stateContainer.savedSearchState.set(savedSearch);
  stateContainer.appState.getState = jest.fn(() => ({
    rowsPerPage: 250,
  }));
  if (dataView) {
    stateContainer.internalState.transitions.setDataView(dataView);
  }
  return stateContainer;
}

describe('onSaveSearch', () => {
  it('should call showSaveModal', async () => {
    await onSaveSearch({
      savedSearch: savedSearchMock,
      services: discoverServiceMock,
      state: getStateContainer(),
    });

    expect(savedObjectsPlugin.showSaveModal).toHaveBeenCalled();
  });

  it('should consider whether a data view is time based', async () => {
    let saveModal: ReactElement | undefined;
    jest.spyOn(savedObjectsPlugin, 'showSaveModal').mockImplementation((modal) => {
      saveModal = modal;
    });

    await onSaveSearch({
      savedSearch: savedSearchMock,
      services: discoverServiceMock,
      state: getStateContainer({ dataView: dataViewMock }),
    });

    expect(saveModal?.props.isTimeBased).toBe(false);

    await onSaveSearch({
      savedSearch: savedSearchMock,
      services: discoverServiceMock,
      state: getStateContainer({ dataView: dataViewWithTimefieldMock }),
    });

    expect(saveModal?.props.isTimeBased).toBe(true);
  });

  it('should pass tags to the save modal', async () => {
    let saveModal: ReactElement | undefined;
    jest.spyOn(savedObjectsPlugin, 'showSaveModal').mockImplementationOnce((modal) => {
      saveModal = modal;
    });
    await onSaveSearch({
      savedSearch: {
        ...savedSearchMock,
        tags: ['tag1', 'tag2'],
      },
      services: discoverServiceMock,
      state: getStateContainer(),
    });
    expect(saveModal?.props.tags).toEqual(['tag1', 'tag2']);
  });

  it('should update the saved search tags', async () => {
    let saveModal: ReactElement | undefined;
    jest.spyOn(savedObjectsPlugin, 'showSaveModal').mockImplementationOnce((modal) => {
      saveModal = modal;
    });
    let savedSearch: SavedSearch = {
      ...savedSearchMock,
      tags: ['tag1', 'tag2'],
    };
    const state = getStateContainer();
    await onSaveSearch({
      savedSearch,
      services: discoverServiceMock,
      state,
    });
    expect(savedSearch.tags).toEqual(['tag1', 'tag2']);

    state.savedSearchState.persist = jest.fn().mockImplementationOnce((newSavedSearch, _) => {
      savedSearch = newSavedSearch;
      return Promise.resolve(newSavedSearch.id);
    });
    saveModal?.props.onSave({
      newTitle: savedSearch.title,
      newCopyOnSave: false,
      newDescription: savedSearch.description,
      newTags: ['tag3', 'tag4'],
      isTitleDuplicateConfirmed: false,
      onTitleDuplicate: jest.fn(),
    });
    expect(savedSearch.tags).toEqual(['tag3', 'tag4']);
  });

  it('should not update tags if savedObjectsTagging is undefined', async () => {
    const serviceMock = discoverServiceMock;
    let saveModal: ReactElement | undefined;
    jest.spyOn(savedObjectsPlugin, 'showSaveModal').mockImplementationOnce((modal) => {
      saveModal = modal;
    });
    let savedSearch: SavedSearch = {
      ...savedSearchMock,
      tags: ['tag1', 'tag2'],
    };
    const state = getStateContainer();
    await onSaveSearch({
      savedSearch,
      services: {
        ...serviceMock,
        savedObjectsTagging: undefined,
      },
      state,
    });
    expect(savedSearch.tags).toEqual(['tag1', 'tag2']);
    state.savedSearchState.persist = jest.fn().mockImplementationOnce((newSavedSearch, _) => {
      savedSearch = newSavedSearch;
      return Promise.resolve(newSavedSearch.id);
    });
    saveModal?.props.onSave({
      newTitle: savedSearch.title,
      newCopyOnSave: false,
      newDescription: savedSearch.description,
      newTags: ['tag3', 'tag4'],
      isTitleDuplicateConfirmed: false,
      onTitleDuplicate: jest.fn(),
    });
    expect(savedSearch.tags).toEqual(['tag1', 'tag2']);
  });
});
