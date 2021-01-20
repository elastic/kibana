/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { SavedObjectSaveModal, showSaveModal } from '../../../../../saved_objects/public';
import { SavedSearch } from '../../../saved_searches';
import { IndexPattern } from '../../../../../data/common/index_patterns/index_patterns';
import { DiscoverServices } from '../../../build_services';
import { GetStateReturn } from '../../angular/discover_state';
import { setBreadcrumbsTitle } from '../../helpers/breadcrumbs';
import { persistSavedSearch } from '../../helpers/persist_saved_search';

async function saveDataSource({
  indexPattern,
  navigateTo,
  savedSearch,
  saveOptions,
  services,
  state,
}: {
  indexPattern: IndexPattern;
  navigateTo: (url: string) => void;
  savedSearch: SavedSearch;
  saveOptions: {
    confirmOverwrite: boolean;
    isTitleDuplicateConfirmed: boolean;
    onTitleDuplicate: () => void;
  };
  services: DiscoverServices;
  state: GetStateReturn;
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

      if (savedSearch.id !== prevSavedSearchId) {
        navigateTo(`/view/${encodeURIComponent(savedSearch.id)}`);
      } else {
        // Update defaults so that "reload saved query" functions correctly
        state.resetAppState();
        services.chrome.docTitle.change(savedSearch.lastSavedTitle!);
        setBreadcrumbsTitle(savedSearch, services.chrome);
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
    indexPattern,
    onError,
    onSuccess,
    saveOptions,
    services,
    state: state.appStateContainer.getState(),
  });
}

export async function onSaveSearch({
  indexPattern,
  navigateTo,
  savedSearch,
  services,
  state,
}: {
  indexPattern: IndexPattern;
  navigateTo: (path: string) => void;
  savedSearch: SavedSearch;
  services: DiscoverServices;
  state: GetStateReturn;
}) {
  const onSave = async ({
    newTitle,
    newCopyOnSave,
    isTitleDuplicateConfirmed,
    onTitleDuplicate,
  }: {
    newTitle: string;
    newCopyOnSave: boolean;
    isTitleDuplicateConfirmed: boolean;
    onTitleDuplicate: () => void;
  }) => {
    const currentTitle = savedSearch.title;
    savedSearch.title = newTitle;
    savedSearch.copyOnSave = newCopyOnSave;
    const saveOptions = {
      confirmOverwrite: false,
      isTitleDuplicateConfirmed,
      onTitleDuplicate,
    };
    const response = await saveDataSource({
      indexPattern,
      saveOptions,
      services,
      navigateTo,
      savedSearch,
      state,
    });
    // If the save wasn't successful, put the original values back.
    if (!response.id || response.error) {
      savedSearch.title = currentTitle;
    } else {
      state.resetInitialAppState();
    }
    return response;
  };

  const saveModal = (
    <SavedObjectSaveModal
      onSave={onSave}
      onClose={() => {}}
      title={savedSearch.title}
      showCopyOnSave={!!savedSearch.id}
      objectType="search"
      description={i18n.translate('discover.localMenu.saveSaveSearchDescription', {
        defaultMessage:
          'Save your Discover search so you can use it in visualizations and dashboards',
      })}
      showDescription={false}
    />
  );
  showSaveModal(saveModal, services.core.i18n.Context);
}
