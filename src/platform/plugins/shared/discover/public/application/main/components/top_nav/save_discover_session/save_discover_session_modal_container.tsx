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
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import { toSavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import type { DiscoverServices } from '../../../../../build_services';
import { TransferAction } from '../../../../../plugin_imports/embeddable_editor_service';
import {
  getSerializedSearchSourceDataViewDetails,
  internalStateActions,
  selectAllTabs,
  selectTabRuntimeState,
  selectTabSavedSearch,
  type DiscoverInternalState,
  type InternalStateDispatch,
  type RuntimeStateManager,
} from '../../../state_management/redux';
import {
  DiscoverSessionSaveDashboardModal,
  type DiscoverSessionSaveDashboardModalSaveProps,
} from './discover_session_save_dashboard_modal';

export interface DiscoverSessionSaveModalContainerProps {
  dispatch: InternalStateDispatch;
  getState: () => DiscoverInternalState;
  initialCopyOnSave?: boolean;
  onClose: () => void;
  onSaveCb?: () => void;
  runtimeStateManager: RuntimeStateManager;
  services: DiscoverServices;
}

export const DiscoverSessionSaveModalContainer = ({
  dispatch,
  getState,
  initialCopyOnSave,
  onClose,
  onSaveCb,
  runtimeStateManager,
  services,
}: DiscoverSessionSaveModalContainerProps) => {
  const internalState = getState();
  const allTabs = selectAllTabs(internalState);
  const persistedDiscoverSession = internalState.persistedDiscoverSession;
  const isEmbeddedEditor = services.embeddableEditor.isEmbeddedEditor();

  const timeRestore = persistedDiscoverSession?.tabs.some((tab) => tab.timeRestore) ?? false;
  const isTimeBased = allTabs.some((tab) => {
    const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tab.id);
    const tabDataView = tabRuntimeState.currentDataView$.getValue();

    if (tabDataView) return tabDataView.isTimeBased();

    const tabDataViewDetails = getSerializedSearchSourceDataViewDetails(
      tab.initialInternalState?.serializedSearchSource,
      internalState.savedDataViews
    );

    return Boolean(tabDataViewDetails?.timeFieldName);
  });

  const isSaveCallbackFlow = Boolean(onSaveCb);
  const showDashboardOptions =
    !isSaveCallbackFlow &&
    (initialCopyOnSave || (!isEmbeddedEditor && !persistedDiscoverSession?.id));

  const navigateToDashboard = (dashboardId: string, serializedState: Record<string, unknown>) => {
    services.embeddable.getStateTransfer().navigateToWithEmbeddablePackages('dashboards', {
      state: [{ type: SEARCH_EMBEDDABLE_TYPE, serializedState }],
      path: dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`,
    });
  };

  const navigateToDashboardByValue = async (
    dashboardId: string,
    newTitle: string,
    newDescription: string
  ) => {
    const tabId = internalState.tabs.unsafeCurrentId;
    const savedSearch = await selectTabSavedSearch({
      tabId,
      getState,
      runtimeStateManager,
      services,
    });
    const { searchSourceJSON, references } = savedSearch.searchSource.serialize();
    const attributes = toSavedSearchAttributes(savedSearch, searchSourceJSON);

    navigateToDashboard(dashboardId, {
      attributes: { ...attributes, references },
      description: newDescription,
      title: newTitle,
    });
  };

  const executeSave = async ({
    addToLibrary,
    dashboardId,
    isTitleDuplicateConfirmed,
    newCopyOnSave,
    newDescription,
    newTags,
    newTimeRestore,
    newTitle,
    onTitleDuplicate,
  }: OnSaveProps & {
    addToLibrary?: boolean;
    dashboardId?: string | null;
    newTags: string[];
    newTimeRestore: boolean;
  }): Promise<{
    discoverSession: DiscoverSession | undefined;
    nextSelectedTabId?: string;
    redirectedToDashboard?: boolean;
  }> => {
    if (addToLibrary === false && dashboardId) {
      await navigateToDashboardByValue(dashboardId, newTitle, newDescription);
      return { discoverSession: undefined, redirectedToDashboard: true };
    }

    const isCopyOnSave = initialCopyOnSave || newCopyOnSave;

    const response = await dispatch(
      internalStateActions.saveDiscoverSession({
        newTitle,
        newTimeRestore,
        newCopyOnSave,
        newDescription,
        newTags,
        isTitleDuplicateConfirmed,
        onTitleDuplicate,
        skipResetDiscoverSession: Boolean(dashboardId) || (isEmbeddedEditor && isCopyOnSave),
      })
    ).unwrap();

    if (response.discoverSession) {
      if (dashboardId) {
        dispatch(
          internalStateActions.setUnsavedChanges({
            hasUnsavedChanges: false,
            unsavedTabIds: [],
          })
        );
        navigateToDashboard(dashboardId, {
          savedObjectId: response.discoverSession.id,
        });
        return { ...response, redirectedToDashboard: true };
      }

      services.toastNotifications.addSuccess({
        title: i18n.translate('discover.notifications.savedSearchTitle', {
          defaultMessage: `Discover session ''{savedSearchTitle}'' was saved`,
          values: { savedSearchTitle: newTitle },
        }),
        'data-test-subj': 'saveSearchSuccess',
      });

      if (onSaveCb) {
        onSaveCb();
      } else if (isEmbeddedEditor) {
        if (!isCopyOnSave) {
          services.embeddableEditor.transferBackToEditor(TransferAction.SaveSession);
        }
      } else if (response.discoverSession.id !== persistedDiscoverSession?.id) {
        services.embeddableEditor.clearEditorState();
        services.locator.navigate({
          savedSearchId: response.discoverSession.id,
          ...(response?.nextSelectedTabId ? { tab: { id: response.nextSelectedTabId } } : {}),
        });
      }
    }

    return response;
  };

  const onSave = async (props: DiscoverSessionSaveDashboardModalSaveProps) => {
    try {
      const response = await executeSave(props);

      if (response.redirectedToDashboard) return;
      if (response.discoverSession) onClose();
    } catch (error) {
      services.toastNotifications.addDanger({
        title: i18n.translate('discover.notifications.notSavedSearchTitle', {
          defaultMessage: `Discover session ''{savedSearchTitle}'' was not saved`,
          values: { savedSearchTitle: props.newTitle },
        }),
        text: error.message,
      });
    }
  };

  return (
    <DiscoverSessionSaveDashboardModal
      description={persistedDiscoverSession?.description}
      hideDashboardOptions={!showDashboardOptions}
      initialTags={persistedDiscoverSession?.tags ?? []}
      initialTimeRestore={timeRestore}
      isTimeBased={isTimeBased}
      managed={persistedDiscoverSession?.managed ?? false}
      onClose={onClose}
      onSave={onSave}
      savedObjectsTagging={services.savedObjectsTagging}
      sessionId={initialCopyOnSave ? undefined : persistedDiscoverSession?.id}
      title={persistedDiscoverSession?.title ?? ''}
    />
  );
};
