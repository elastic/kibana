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
import { dataViewMock } from '../../../../__mocks__/data_view';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { DiscoverServices } from '../../../../build_services';
import { DiscoverStateContainer } from '../../services/discover_state';
import { i18nServiceMock } from '@kbn/core/public/mocks';
import { ReactElement } from 'react';
import { discoverServiceMock } from '../../../../__mocks__/services';
import * as persistSavedSearchUtils from '../../utils/persist_saved_search';
import { SavedSearch } from '@kbn/saved-search-plugin/public';

describe('onSaveSearch', () => {
  it('should call showSaveModal', async () => {
    const serviceMock = {
      core: {
        i18n: i18nServiceMock.create(),
      },
    } as unknown as DiscoverServices;
    const stateMock = {
      appState: {
        getState: () => ({
          rowsPerPage: 250,
        }),
      },
    } as unknown as DiscoverStateContainer;

    await onSaveSearch({
      dataView: dataViewMock,
      navigateTo: jest.fn(),
      savedSearch: savedSearchMock,
      services: serviceMock,
      state: stateMock,
      updateAdHocDataViewId: jest.fn(),
    });

    expect(savedObjectsPlugin.showSaveModal).toHaveBeenCalled();
  });

  it('should pass tags to the save modal', async () => {
    const serviceMock = discoverServiceMock;
    const stateMock = {
      appState: {
        getState: () => ({
          rowsPerPage: 250,
        }),
      },
    } as unknown as DiscoverStateContainer;
    let saveModal: ReactElement | undefined;
    jest.spyOn(savedObjectsPlugin, 'showSaveModal').mockImplementationOnce((modal) => {
      saveModal = modal;
    });
    await onSaveSearch({
      dataView: dataViewMock,
      navigateTo: jest.fn(),
      savedSearch: {
        ...savedSearchMock,
        tags: ['tag1', 'tag2'],
      },
      services: serviceMock,
      state: stateMock,
      updateAdHocDataViewId: jest.fn(),
    });
    expect(saveModal?.props.tags).toEqual(['tag1', 'tag2']);
  });

  it('should update the saved search tags', async () => {
    const serviceMock = discoverServiceMock;
    const stateMock = {
      appState: {
        getState: () => ({
          rowsPerPage: 250,
        }),
      },
      resetInitialAppState: jest.fn(),
    } as unknown as DiscoverStateContainer;
    let saveModal: ReactElement | undefined;
    jest.spyOn(savedObjectsPlugin, 'showSaveModal').mockImplementationOnce((modal) => {
      saveModal = modal;
    });
    let savedSearch: SavedSearch = {
      ...savedSearchMock,
      tags: ['tag1', 'tag2'],
    };
    await onSaveSearch({
      dataView: dataViewMock,
      navigateTo: jest.fn(),
      savedSearch,
      services: serviceMock,
      state: stateMock,
      updateAdHocDataViewId: jest.fn(),
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
    const stateMock = {
      appState: {
        getState: () => ({
          rowsPerPage: 250,
        }),
      },
      resetInitialAppState: jest.fn(),
    } as unknown as DiscoverStateContainer;
    let saveModal: ReactElement | undefined;
    jest.spyOn(savedObjectsPlugin, 'showSaveModal').mockImplementationOnce((modal) => {
      saveModal = modal;
    });
    let savedSearch: SavedSearch = {
      ...savedSearchMock,
      tags: ['tag1', 'tag2'],
    };
    await onSaveSearch({
      dataView: dataViewMock,
      navigateTo: jest.fn(),
      savedSearch,
      services: {
        ...serviceMock,
        savedObjectsTagging: undefined,
      },
      state: stateMock,
      updateAdHocDataViewId: jest.fn(),
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
