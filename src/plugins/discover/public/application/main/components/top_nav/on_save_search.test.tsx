/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as savedObjectsPlugin from '@kbn/saved-objects-plugin/public';
jest.mock('@kbn/saved-objects-plugin/public');
jest.mock('../../utils/persist_saved_search', () => ({
  persistSavedSearch: jest.fn(() => ({ id: 'the-saved-search-id' })),
}));
import { onSaveSearch } from './on_save_search';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { getDiscoverStateContainer } from '../../services/discover_state';
import { ReactElement } from 'react';
import { discoverServiceMock } from '../../../../__mocks__/services';
import * as persistSavedSearchUtils from '../../utils/persist_saved_search';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { createBrowserHistory } from 'history';

function getStateContainer() {
  const savedSearch = savedSearchMock;
  const history = createBrowserHistory();
  const stateContainer = getDiscoverStateContainer({
    savedSearch,
    services: discoverServiceMock,
    history,
  });
  stateContainer.appState.getState = jest.fn(() => ({
    rowsPerPage: 250,
  }));
  return stateContainer;
}

describe('onSaveSearch', () => {
  it('should call showSaveModal', async () => {
    await onSaveSearch({
      navigateTo: jest.fn(),
      savedSearch: savedSearchMock,
      services: discoverServiceMock,
      state: getStateContainer(),
    });

    expect(savedObjectsPlugin.showSaveModal).toHaveBeenCalled();
  });

  it('should pass tags to the save modal', async () => {
    let saveModal: ReactElement | undefined;
    jest.spyOn(savedObjectsPlugin, 'showSaveModal').mockImplementationOnce((modal) => {
      saveModal = modal;
    });
    await onSaveSearch({
      navigateTo: jest.fn(),
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
    await onSaveSearch({
      navigateTo: jest.fn(),
      savedSearch,
      services: discoverServiceMock,
      state: getStateContainer(),
    });
    expect(savedSearch.tags).toEqual(['tag1', 'tag2']);
    jest
      .spyOn(persistSavedSearchUtils, 'persistSavedSearch')
      .mockImplementationOnce((newSavedSearch, _) => {
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
    await onSaveSearch({
      navigateTo: jest.fn(),
      savedSearch,
      services: {
        ...serviceMock,
        savedObjectsTagging: undefined,
      },
      state: getStateContainer(),
    });
    expect(savedSearch.tags).toEqual(['tag1', 'tag2']);
    jest
      .spyOn(persistSavedSearchUtils, 'persistSavedSearch')
      .mockImplementationOnce((newSavedSearch, _) => {
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
