/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { DiscoverServices } from '../../../../../build_services';
import { TransferAction } from '../../../../../plugin_imports/embeddable_editor_service';
import {
  getSerializedSearchSourceDataViewDetails,
  internalStateActions,
  selectAllTabs,
  selectPersistedDiscoverSession,
  selectSavedDataViews,
  selectTabRuntimeState,
  useInternalStateDispatch,
  useInternalStateSelector,
  useRuntimeStateManager,
} from '../../../state_management/redux';
import {
  DiscoverSessionSaveDashboardModal,
  type DiscoverSessionSaveDashboardModalSaveProps,
} from './discover_session_save_dashboard_modal';

export interface DiscoverSessionSaveModalContainerProps {
  initialCopyOnSave?: boolean;
  onClose: () => void;
  onSaveCb?: () => void;
  services: DiscoverServices;
}

export const DiscoverSessionSaveModalContainer = ({
  initialCopyOnSave,
  onClose,
  onSaveCb,
  services,
}: DiscoverSessionSaveModalContainerProps) => {
  const dispatch = useInternalStateDispatch();
  const runtimeStateManager = useRuntimeStateManager();
  const allTabs = useInternalStateSelector(selectAllTabs);
  const persistedDiscoverSession = useInternalStateSelector(selectPersistedDiscoverSession);
  const savedDataViews = useInternalStateSelector(selectSavedDataViews);

  const isEmbeddedEditor = services.embeddableEditor.isEmbeddedEditor();

  const timeRestore = persistedDiscoverSession?.tabs.some((tab) => tab.timeRestore) ?? false;
  const isTimeBased = allTabs.some((tab) => {
    const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tab.id);
    const tabDataView = tabRuntimeState.currentDataView$.getValue();

    if (tabDataView) return tabDataView.isTimeBased();

    const tabDataViewDetails = getSerializedSearchSourceDataViewDetails(
      tab.initialInternalState?.serializedSearchSource,
      savedDataViews
    );

    return Boolean(tabDataViewDetails?.timeFieldName);
  });

  const isSaveCallbackFlow = Boolean(onSaveCb);

  const [copyOnSaveToggled, setCopyOnSaveToggled] = useState(false);

  const showDashboardOptionsForSaveAs = initialCopyOnSave || copyOnSaveToggled;
  const showDashboardOptionsForNewSession = !isEmbeddedEditor && !persistedDiscoverSession?.id;

  const showDashboardOptions =
    !isSaveCallbackFlow && (showDashboardOptionsForSaveAs || showDashboardOptionsForNewSession);

  const onCopyOnSaveChange = useCallback((newCopyOnSave: boolean) => {
    setCopyOnSaveToggled(newCopyOnSave);
  }, []);

  const executeSave = async ({
    dashboardId,
    isTitleDuplicateConfirmed,
    newCopyOnSave,
    newDescription,
    newTags,
    newTimeRestore,
    newTitle,
    onTitleDuplicate,
  }: OnSaveProps & {
    dashboardId?: string | null;
    newTags: string[];
    newTimeRestore: boolean;
  }): Promise<{
    discoverSession: DiscoverSession | undefined;
    nextSelectedTabId?: string;
    redirectedToDashboard?: boolean;
  }> => {
    const userWantsCopy = initialCopyOnSave || newCopyOnSave;
    const effectiveCopyOnSave = userWantsCopy && !!persistedDiscoverSession?.id;

    const response = await dispatch(
      internalStateActions.saveDiscoverSession({
        newTitle,
        newTimeRestore,
        newCopyOnSave: effectiveCopyOnSave,
        newDescription,
        newTags,
        isTitleDuplicateConfirmed,
        onTitleDuplicate,
      })
    ).unwrap();

    if (response.discoverSession) {
      if (dashboardId) {
        services.embeddableEditor.transferBackToEditor(TransferAction.SaveByReference, {
          app: 'dashboards',
          path: dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`,
          state: {
            savedObjectId: response.discoverSession.id,
          },
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

      const shouldNavigateToSavedSession =
        (isEmbeddedEditor && userWantsCopy) ||
        (!isEmbeddedEditor && response.discoverSession.id !== persistedDiscoverSession?.id);

      if (onSaveCb) {
        onSaveCb();
      } else if (shouldNavigateToSavedSession) {
        services.embeddableEditor.clearEditorState();
        services.locator.navigate({
          savedSearchId: response.discoverSession.id,
          ...(response?.nextSelectedTabId ? { tab: { id: response.nextSelectedTabId } } : {}),
        });
      } else if (isEmbeddedEditor) {
        services.embeddableEditor.transferBackToEditor(TransferAction.SaveSession);
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
      onCopyOnSaveChange={onCopyOnSaveChange}
      onSave={onSave}
      savedObjectsTagging={services.savedObjectsTagging}
      sessionId={initialCopyOnSave ? undefined : persistedDiscoverSession?.id}
      title={persistedDiscoverSession?.title ?? ''}
    />
  );
};
