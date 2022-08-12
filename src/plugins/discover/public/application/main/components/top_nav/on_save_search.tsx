/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { SavedObjectSaveModal, showSaveModal, OnSaveProps } from '@kbn/saved-objects-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { SavedSearch, SaveSavedSearchOptions } from '@kbn/saved-search-plugin/public';
import { DiscoverServices } from '../../../../build_services';
import { GetStateReturn } from '../../services/discover_state';
import { setBreadcrumbsTitle } from '../../../../utils/breadcrumbs';
import { persistSavedSearch } from '../../utils/persist_saved_search';
import { DOC_TABLE_LEGACY } from '../../../../../common';

async function saveDataSource({
  dataView,
  navigateTo,
  savedSearch,
  saveOptions,
  services,
  state,
  navigateOrReloadSavedSearch,
}: {
  dataView: DataView;
  navigateTo: (url: string) => void;
  savedSearch: SavedSearch;
  saveOptions: SaveSavedSearchOptions;
  services: DiscoverServices;
  state: GetStateReturn;
  navigateOrReloadSavedSearch: boolean;
}) {
  const prevSavedSearchId = savedSearch.id;
  function onSuccess(id: string) {
    if (id) {
      services.toastNotifications.addSuccess({
        title: i18n.translate('discover.notifications.savedSearchTitle', {
          defaultMessage: `Search '{savedSearchTitle}' was saved`,
          values: {
            savedSearchTitle: savedSearch.title,
          },
        }),
        'data-test-subj': 'saveSearchSuccess',
      });
      if (navigateOrReloadSavedSearch) {
        if (id !== prevSavedSearchId) {
          navigateTo(`/view/${encodeURIComponent(id)}`);
        } else {
          // Update defaults so that "reload saved query" functions correctly
          state.resetAppState();
          services.chrome.docTitle.change(savedSearch.title!);

          setBreadcrumbsTitle(
            {
              ...savedSearch,
              id: prevSavedSearchId ?? id,
            },
            services.chrome
          );
        }
      }
    }
  }

  function onError(error: Error) {
    services.toastNotifications.addDanger({
      title: i18n.translate('discover.notifications.notSavedSearchTitle', {
        defaultMessage: `Search '{savedSearchTitle}' was not saved.`,
        values: {
          savedSearchTitle: savedSearch.title,
        },
      }),
      text: error.message,
    });
  }
  return persistSavedSearch(savedSearch, {
    dataView,
    onError,
    onSuccess,
    saveOptions,
    services,
    state: state.appStateContainer.getState(),
  });
}

export async function onSaveSearch({
  dataView,
  navigateTo,
  savedSearch,
  services,
  state,
  onClose,
  onSaveCb,
}: {
  dataView: DataView;
  navigateTo: (path: string) => void;
  savedSearch: SavedSearch;
  services: DiscoverServices;
  state: GetStateReturn;
  onClose?: () => void;
  onSaveCb?: () => void;
}) {
  const { uiSettings } = services;
  const onSave = async ({
    newTitle,
    newCopyOnSave,
    newDescription,
    isTitleDuplicateConfirmed,
    onTitleDuplicate,
  }: {
    newTitle: string;
    newCopyOnSave: boolean;
    newDescription: string;
    isTitleDuplicateConfirmed: boolean;
    onTitleDuplicate: () => void;
  }) => {
    const currentTitle = savedSearch.title;
    const currentRowsPerPage = savedSearch.rowsPerPage;
    savedSearch.title = newTitle;
    savedSearch.description = newDescription;
    savedSearch.rowsPerPage = uiSettings.get(DOC_TABLE_LEGACY)
      ? currentRowsPerPage
      : state.appStateContainer.getState().rowsPerPage;
    const saveOptions: SaveSavedSearchOptions = {
      onTitleDuplicate,
      copyOnSave: newCopyOnSave,
      isTitleDuplicateConfirmed,
    };
    const navigateOrReloadSavedSearch = !Boolean(onSaveCb);
    const response = await saveDataSource({
      dataView,
      saveOptions,
      services,
      navigateTo,
      savedSearch,
      state,
      navigateOrReloadSavedSearch,
    });
    // If the save wasn't successful, put the original values back.
    if (!response.id || response.error) {
      savedSearch.title = currentTitle;
      savedSearch.rowsPerPage = currentRowsPerPage;
    } else {
      state.resetInitialAppState();
    }
    onSaveCb?.();
    return response;
  };

  const saveModal = (
    <SaveSearchObjectModal
      title={savedSearch.title ?? ''}
      showCopyOnSave={!!savedSearch.id}
      description={savedSearch.description}
      onSave={onSave}
      onClose={onClose ?? (() => {})}
    />
  );
  showSaveModal(saveModal, services.core.i18n.Context);
}

const SaveSearchObjectModal: React.FC<{
  title: string;
  showCopyOnSave: boolean;
  description?: string;
  onSave: (props: OnSaveProps & { newRowsPerPage?: number }) => void;
  onClose: () => void;
}> = ({ title, description, showCopyOnSave, onSave, onClose }) => {
  const onModalSave = (params: OnSaveProps) => {
    onSave(params);
  };

  return (
    <SavedObjectSaveModal
      title={title}
      showCopyOnSave={showCopyOnSave}
      description={description}
      objectType={i18n.translate('discover.localMenu.saveSaveSearchObjectType', {
        defaultMessage: 'search',
      })}
      showDescription={true}
      onSave={onModalSave}
      onClose={onClose}
    />
  );
};
