/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { showSaveModal } from '@kbn/saved-objects-plugin/public';
import {
  toSavedSearchAttributes,
  type DiscoverSession,
  type SavedSearchByValueAttributes,
} from '@kbn/saved-search-plugin/common';
import type { DiscoverServices } from '../../../../../build_services';
import type { DiscoverStateContainer } from '../../../state_management/discover_state';
import {
  getSerializedSearchSourceDataViewDetails,
  internalStateActions,
  selectAllTabs,
  selectTabRuntimeState,
} from '../../../state_management/redux';
import type { DiscoverSessionSaveModalOnSaveCallback } from './save_modal';
import { DiscoverSessionSaveModal } from './save_modal';

export interface OnSaveDiscoverSessionParams {
  services: DiscoverServices;
  state: DiscoverStateContainer;
  initialCopyOnSave?: boolean;
  onClose?: () => void;
  onSaveCb?: (valueState?: SavedSearchByValueAttributes) => void;
}

export const onSaveDiscoverSession = async ({
  services,
  state,
  initialCopyOnSave,
  onClose,
  onSaveCb,
}: OnSaveDiscoverSessionParams) => {
  if (services.embeddableEditor.isByValueEditor()) {
    const savedSearch = state.savedSearchState.getState();
    const { searchSourceJSON, references } = savedSearch.searchSource.serialize();
    const attributes = toSavedSearchAttributes(savedSearch, searchSourceJSON);

    onSaveCb?.({ ...attributes, references });
  } else {
    const internalState = state.internalState.getState();
    const persistedDiscoverSession = internalState.persistedDiscoverSession;
    const allTabs = selectAllTabs(internalState);

    const timeRestore = persistedDiscoverSession?.tabs.some((tab) => tab.timeRestore) ?? false;
    const isTimeBased = allTabs.some((tab) => {
      const tabRuntimeState = selectTabRuntimeState(state.runtimeStateManager, tab.id);
      const tabDataView = tabRuntimeState.currentDataView$.getValue();

      if (tabDataView) {
        return tabDataView.isTimeBased();
      }

      const tabDataViewDetails = getSerializedSearchSourceDataViewDetails(
        tab.initialInternalState?.serializedSearchSource,
        internalState.savedDataViews
      );

      return Boolean(tabDataViewDetails?.timeFieldName);
    });

    const onSave: DiscoverSessionSaveModalOnSaveCallback = async ({
      newTitle,
      newCopyOnSave,
      newTimeRestore,
      newDescription,
      newTags,
      isTitleDuplicateConfirmed,
      onTitleDuplicate,
    }) => {
      let response: { discoverSession: DiscoverSession | undefined; nextSelectedTabId?: string } = {
        discoverSession: undefined,
      };

      try {
        response = await state.internalState
          .dispatch(
            internalStateActions.saveDiscoverSession({
              newTitle,
              newTimeRestore,
              newCopyOnSave,
              newDescription,
              newTags,
              isTitleDuplicateConfirmed,
              onTitleDuplicate,
            })
          )
          .unwrap();
      } catch (error) {
        services.toastNotifications.addDanger({
          title: i18n.translate('discover.notifications.notSavedSearchTitle', {
            defaultMessage: `Discover session ''{savedSearchTitle}'' was not saved`,
            values: {
              savedSearchTitle: newTitle,
            },
          }),
          text: error.message,
        });
      }

      if (response.discoverSession) {
        services.toastNotifications.addSuccess({
          title: i18n.translate('discover.notifications.savedSearchTitle', {
            defaultMessage: `Discover session ''{savedSearchTitle}'' was saved`,
            values: {
              savedSearchTitle: newTitle,
            },
          }),
          'data-test-subj': 'saveSearchSuccess',
        });

        if (onSaveCb) {
          onSaveCb();
        } else if (response.discoverSession.id !== persistedDiscoverSession?.id) {
          services.locator.navigate({
            savedSearchId: response.discoverSession.id,
            ...(response?.nextSelectedTabId ? { tab: { id: response.nextSelectedTabId } } : {}),
          });
        }
      }

      return { id: response.discoverSession?.id };
    };

    const saveModal = (
      <DiscoverSessionSaveModal
        isTimeBased={isTimeBased}
        services={services}
        title={persistedDiscoverSession?.title ?? ''}
        showCopyOnSave={
          !services.embeddableEditor.isEmbeddedEditor() && !!persistedDiscoverSession?.id
        }
        initialCopyOnSave={initialCopyOnSave}
        description={persistedDiscoverSession?.description}
        timeRestore={timeRestore}
        tags={persistedDiscoverSession?.tags ?? []}
        managed={persistedDiscoverSession?.managed ?? false}
        onSave={onSave}
        onClose={onClose ?? (() => {})}
      />
    );

    showSaveModal(saveModal);
  }
};
