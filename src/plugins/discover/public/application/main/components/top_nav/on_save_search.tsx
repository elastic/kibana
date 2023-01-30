/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedObjectSaveModal, showSaveModal, OnSaveProps } from '@kbn/saved-objects-plugin/public';
import { SavedSearch, SaveSavedSearchOptions } from '@kbn/saved-search-plugin/public';
import { DiscoverServices } from '../../../../build_services';
import { DiscoverStateContainer } from '../../services/discover_state';
import { setBreadcrumbsTitle } from '../../../../utils/breadcrumbs';
import { DOC_TABLE_LEGACY } from '../../../../../common';

async function saveDataSource({
  navigateTo,
  savedSearch,
  saveOptions,
  services,
  state,
  navigateOrReloadSavedSearch,
}: {
  navigateTo: (url: string) => void;
  savedSearch: SavedSearch;
  saveOptions: SaveSavedSearchOptions;
  services: DiscoverServices;
  state: DiscoverStateContainer;
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
          state.resetAppState(savedSearch);
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
  return state.savedSearchState.persist(savedSearch, {
    onError,
    onSuccess,
    saveOptions,
  });
}

export async function onSaveSearch({
  navigateTo,
  savedSearch,
  services,
  state,
  onClose,
  onSaveCb,
}: {
  navigateTo: (path: string) => void;
  savedSearch: SavedSearch;
  services: DiscoverServices;
  state: DiscoverStateContainer;
  onClose?: () => void;
  onSaveCb?: () => void;
}) {
  const { uiSettings, savedObjectsTagging } = services;
  const onSave = async ({
    newTitle,
    newCopyOnSave,
    newTimeRestore,
    newDescription,
    newTags,
    isTitleDuplicateConfirmed,
    onTitleDuplicate,
  }: {
    newTitle: string;
    newTimeRestore: boolean;
    newCopyOnSave: boolean;
    newDescription: string;
    newTags: string[];
    isTitleDuplicateConfirmed: boolean;
    onTitleDuplicate: () => void;
  }) => {
    const currentTitle = savedSearch.title;
    const currentTimeRestore = savedSearch.timeRestore;
    const currentRowsPerPage = savedSearch.rowsPerPage;
    const currentDescription = savedSearch.description;
    const currentTags = savedSearch.tags;
    savedSearch.title = newTitle;
    savedSearch.description = newDescription;
    savedSearch.timeRestore = newTimeRestore;
    savedSearch.rowsPerPage = uiSettings.get(DOC_TABLE_LEGACY)
      ? currentRowsPerPage
      : state.appState.getState().rowsPerPage;
    if (savedObjectsTagging) {
      savedSearch.tags = newTags;
    }
    const saveOptions: SaveSavedSearchOptions = {
      onTitleDuplicate,
      copyOnSave: newCopyOnSave,
      isTitleDuplicateConfirmed,
    };

    const navigateOrReloadSavedSearch = !Boolean(onSaveCb);
    try {
      const response = await saveDataSource({
        saveOptions,
        services,
        navigateTo,
        savedSearch,
        state,
        navigateOrReloadSavedSearch,
      });
      onSaveCb?.();
      return response;
    } catch (e) {
      // If the save wasn't successful, put the original values back.

      savedSearch.title = currentTitle;
      savedSearch.timeRestore = currentTimeRestore;
      savedSearch.rowsPerPage = currentRowsPerPage;
      savedSearch.description = currentDescription;
      if (savedObjectsTagging) {
        savedSearch.tags = currentTags;
      }
    }
  };

  const saveModal = (
    <SaveSearchObjectModal
      services={services}
      title={savedSearch.title ?? ''}
      showCopyOnSave={!!savedSearch.id}
      description={savedSearch.description}
      timeRestore={savedSearch.timeRestore}
      tags={savedSearch.tags ?? []}
      onSave={onSave}
      onClose={onClose ?? (() => {})}
    />
  );
  showSaveModal(saveModal);
}

const SaveSearchObjectModal: React.FC<{
  services: DiscoverServices;
  title: string;
  showCopyOnSave: boolean;
  description?: string;
  timeRestore?: boolean;
  tags: string[];
  onSave: (props: OnSaveProps & { newTimeRestore: boolean; newTags: string[] }) => void;
  onClose: () => void;
}> = ({
  services,
  title,
  description,
  tags,
  showCopyOnSave,
  timeRestore: savedTimeRestore,
  onSave,
  onClose,
}) => {
  const { savedObjectsTagging } = services;
  const [timeRestore, setTimeRestore] = useState<boolean>(savedTimeRestore || false);
  const [currentTags, setCurrentTags] = useState(tags);

  const onModalSave = (params: OnSaveProps) => {
    onSave({
      ...params,
      newTimeRestore: timeRestore,
      newTags: currentTags,
    });
  };

  const tagSelector = savedObjectsTagging ? (
    <savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector
      initialSelection={currentTags}
      onTagsSelected={(newTags) => {
        setCurrentTags(newTags);
      }}
    />
  ) : undefined;

  const timeSwitch = (
    <EuiFormRow
      helpText={
        <FormattedMessage
          id="discover.topNav.saveModal.storeTimeWithSearchToggleDescription"
          defaultMessage="Update the time filter and refresh interval to the current selection when using this search."
        />
      }
    >
      <EuiSwitch
        data-test-subj="storeTimeWithSearch"
        checked={timeRestore}
        onChange={(event) => setTimeRestore(event.target.checked)}
        label={
          <FormattedMessage
            id="discover.topNav.saveModal.storeTimeWithSearchToggleLabel"
            defaultMessage="Store time with saved search"
          />
        }
      />
    </EuiFormRow>
  );

  const options = tagSelector ? (
    <>
      {tagSelector}
      {timeSwitch}
    </>
  ) : (
    timeSwitch
  );

  return (
    <SavedObjectSaveModal
      title={title}
      showCopyOnSave={showCopyOnSave}
      description={description}
      objectType={i18n.translate('discover.localMenu.saveSaveSearchObjectType', {
        defaultMessage: 'search',
      })}
      showDescription={true}
      options={options}
      onSave={onModalSave}
      onClose={onClose}
    />
  );
};
