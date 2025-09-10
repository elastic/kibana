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
import { isObject } from 'lodash';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { DiscoverServices } from '../../../../../build_services';
import type { DiscoverStateContainer } from '../../../state_management/discover_state';
import {
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
  onSaveCb?: () => void;
}

export const onSaveDiscoverSession = async ({
  services,
  state,
  initialCopyOnSave,
  onClose,
  onSaveCb,
}: OnSaveDiscoverSessionParams) => {
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

    const tabDataViewIdOrSpec = tab.initialInternalState?.serializedSearchSource?.index;

    if (!tabDataViewIdOrSpec) {
      return false;
    }

    if (isObject(tabDataViewIdOrSpec)) {
      return Boolean(tabDataViewIdOrSpec.timeFieldName);
    }

    const dataViewListItem = internalState.savedDataViews.find(
      (item) => item.id === tabDataViewIdOrSpec
    );

    return Boolean(dataViewListItem?.timeFieldName);
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
    let response: { discoverSession: DiscoverSession | undefined } = { discoverSession: undefined };

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
        services.locator.navigate({ savedSearchId: response.discoverSession.id });
      }
    }

    return { id: response.discoverSession?.id };
  };

  const saveModal = (
    <DiscoverSessionSaveModal
      isTimeBased={isTimeBased}
      services={services}
      title={persistedDiscoverSession?.title ?? ''}
      showCopyOnSave={!!persistedDiscoverSession?.id}
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
};
