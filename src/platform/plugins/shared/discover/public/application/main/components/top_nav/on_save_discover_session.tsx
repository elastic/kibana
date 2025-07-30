/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import { SavedObjectSaveModal, showSaveModal } from '@kbn/saved-objects-plugin/public';
import { isObject } from 'lodash';
import type { DiscoverServices } from '../../../../build_services';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import {
  internalStateActions,
  selectAllTabs,
  selectTabRuntimeState,
} from '../../state_management/redux';

export const onSaveDiscoverSession = async ({
  services,
  state,
  initialCopyOnSave,
  onClose,
  onSaveCb,
}: {
  services: DiscoverServices;
  state: DiscoverStateContainer;
  initialCopyOnSave?: boolean;
  onClose?: () => void;
  onSaveCb?: () => void;
}) => {
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
    let response: { id: string | undefined } = { id: undefined };

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
          defaultMessage: `Discover session ''{savedSearchTitle}'' was not saved.`,
          values: {
            savedSearchTitle: newTitle,
          },
        }),
        text: error.message,
      });
    }

    if (!response.id) {
      return;
    }

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
    } else if (response.id !== persistedDiscoverSession?.id) {
      services.locator.navigate({ savedSearchId: response.id });
    } else {
      // Update defaults so that "reload saved query" functions correctly
      state.actions.undoSavedSearchChanges();
    }
  };

  const saveModal = (
    <SaveSearchObjectModal
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

const SaveSearchObjectModal: React.FC<{
  isTimeBased: boolean;
  services: DiscoverServices;
  title: string;
  showCopyOnSave: boolean;
  initialCopyOnSave?: boolean;
  description?: string;
  timeRestore?: boolean;
  tags: string[];
  onSave: (props: OnSaveProps & { newTimeRestore: boolean; newTags: string[] }) => void;
  onClose: () => void;
  managed: boolean;
}> = ({
  isTimeBased,
  services: { savedObjectsTagging },
  title,
  description,
  tags,
  showCopyOnSave,
  initialCopyOnSave,
  timeRestore: savedTimeRestore,
  onSave,
  onClose,
  managed,
}) => {
  const [timeRestore, setTimeRestore] = useState((isTimeBased && savedTimeRestore) || false);
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
  ) : null;

  const timeSwitch = isTimeBased ? (
    <EuiFormRow
      helpText={
        <FormattedMessage
          id="discover.topNav.saveModal.storeTimeWithSearchToggleDescription"
          defaultMessage="Update the time filter and refresh interval to the current selection when using this session."
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
            defaultMessage="Store time with Discover session"
          />
        }
      />
    </EuiFormRow>
  ) : null;

  const options = (
    <>
      {tagSelector}
      {timeSwitch}
    </>
  );

  return (
    <SavedObjectSaveModal
      title={title}
      showCopyOnSave={showCopyOnSave}
      initialCopyOnSave={initialCopyOnSave}
      description={description}
      objectType={i18n.translate('discover.localMenu.saveSaveSearchObjectType', {
        defaultMessage: 'Discover session',
      })}
      showDescription={true}
      options={options}
      onSave={onModalSave}
      onClose={onClose}
      mustCopyOnSaveMessage={
        managed
          ? i18n.translate('discover.localMenu.mustCopyOnSave', {
              defaultMessage:
                'Elastic manages this Discover session. Save any changes to a new Discover session.',
            })
          : undefined
      }
    />
  );
};
