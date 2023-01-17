/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { batch } from 'react-redux';
import { showSaveModal } from '@kbn/saved-objects-plugin/public';

import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { DASHBOARD_SAVED_OBJECT_TYPE, SAVED_OBJECT_ADD_TIME } from '../../../dashboard_constants';
import { DashboardSaveOptions, DashboardStateFromSaveModal } from '../../types';
import { DashboardSaveModal } from './overlays/save_modal';
import { DashboardContainer } from '../dashboard_container';
import { showCloneModal } from './overlays/show_clone_modal';
import { pluginServices } from '../../../services/plugin_services';
import { DashboardContainerByValueInput } from '../../../../common';
import { SaveDashboardReturn } from '../../../services/dashboard_saved_object/types';

export function runSaveAs(this: DashboardContainer) {
  const {
    data: {
      query: {
        timefilter: { timefilter },
      },
    },
    coreContext: { i18nContext },
    savedObjectsTagging: { hasApi: hasSavedObjectsTagging },
    dashboardSavedObject: { checkForDuplicateDashboardTitle, saveDashboardStateToSavedObject },
  } = pluginServices.getServices();

  const {
    getState,
    dispatch,
    actions: { setStateFromSaveModal, setLastSavedInput },
  } = this.getReduxEmbeddableTools();
  const {
    explicitInput: currentState,
    componentState: { lastSavedId },
  } = getState();

  return new Promise<SaveDashboardReturn | undefined>((resolve) => {
    const onSave = async ({
      newTags,
      newTitle,
      newDescription,
      newCopyOnSave,
      newTimeRestore,
      onTitleDuplicate,
      isTitleDuplicateConfirmed,
    }: DashboardSaveOptions): Promise<SaveDashboardReturn> => {
      const saveOptions = {
        confirmOverwrite: false,
        isTitleDuplicateConfirmed,
        onTitleDuplicate,
        saveAsCopy: newCopyOnSave,
      };
      const stateFromSaveModal: DashboardStateFromSaveModal = {
        title: newTitle,
        tags: [] as string[],
        description: newDescription,
        timeRestore: newTimeRestore,
        timeRange: newTimeRestore ? timefilter.getTime() : undefined,
        refreshInterval: newTimeRestore ? timefilter.getRefreshInterval() : undefined,
      };
      if (hasSavedObjectsTagging && newTags) {
        // remove `hasSavedObjectsTagging` once the savedObjectsTagging service is optional
        stateFromSaveModal.tags = newTags;
      }
      if (
        !(await checkForDuplicateDashboardTitle({
          title: newTitle,
          onTitleDuplicate,
          lastSavedTitle: currentState.title,
          copyOnSave: newCopyOnSave,
          isTitleDuplicateConfirmed,
        }))
      ) {
        // do not save if title is duplicate and is unconfirmed
        return {};
      }
      const stateToSave: DashboardContainerByValueInput = {
        ...currentState,
        ...stateFromSaveModal,
      };
      const beforeAddTime = window.performance.now();
      const saveResult = await saveDashboardStateToSavedObject({
        currentState: stateToSave,
        saveOptions,
        lastSavedId,
      });
      const addDuration = window.performance.now() - beforeAddTime;
      reportPerformanceMetricEvent(pluginServices.getServices().analytics, {
        eventName: SAVED_OBJECT_ADD_TIME,
        duration: addDuration,
        meta: {
          saved_object_type: DASHBOARD_SAVED_OBJECT_TYPE,
        },
      });

      stateFromSaveModal.lastSavedId = saveResult.id;
      if (saveResult.id) {
        batch(() => {
          dispatch(setStateFromSaveModal(stateFromSaveModal));
          dispatch(setLastSavedInput(stateToSave));
        });
      }
      if (newCopyOnSave || !lastSavedId) this.expectIdChange();
      resolve(saveResult);
      return saveResult;
    };

    const dashboardSaveModal = (
      <DashboardSaveModal
        tags={currentState.tags}
        title={currentState.title}
        onClose={() => resolve(undefined)}
        timeRestore={currentState.timeRestore}
        description={currentState.description ?? ''}
        showCopyOnSave={lastSavedId ? true : false}
        onSave={onSave}
      />
    );
    this.clearOverlays();
    showSaveModal(dashboardSaveModal, i18nContext);
  });
}

/**
 * Save the current state of this dashboard to a saved object without showing any save modal.
 */
export async function runQuickSave(this: DashboardContainer) {
  const {
    dashboardSavedObject: { saveDashboardStateToSavedObject },
  } = pluginServices.getServices();

  const {
    getState,
    dispatch,
    actions: { setLastSavedInput },
  } = this.getReduxEmbeddableTools();
  const {
    explicitInput: currentState,
    componentState: { lastSavedId },
  } = getState();

  const saveResult = await saveDashboardStateToSavedObject({
    lastSavedId,
    currentState,
    saveOptions: {},
  });
  dispatch(setLastSavedInput(currentState));

  return saveResult;
}

export async function runClone(this: DashboardContainer) {
  const {
    dashboardSavedObject: { saveDashboardStateToSavedObject, checkForDuplicateDashboardTitle },
  } = pluginServices.getServices();

  const {
    getState,
    dispatch,
    actions: { setTitle },
  } = this.getReduxEmbeddableTools();
  const { explicitInput: currentState } = getState();

  return new Promise<SaveDashboardReturn | undefined>((resolve) => {
    const onClone = async (
      newTitle: string,
      isTitleDuplicateConfirmed: boolean,
      onTitleDuplicate: () => void
    ) => {
      if (
        !(await checkForDuplicateDashboardTitle({
          title: newTitle,
          onTitleDuplicate,
          lastSavedTitle: currentState.title,
          copyOnSave: true,
          isTitleDuplicateConfirmed,
        }))
      ) {
        // do not clone if title is duplicate and is unconfirmed
        return {};
      }
      const saveResult = await saveDashboardStateToSavedObject({
        saveOptions: { saveAsCopy: true },
        currentState: { ...currentState, title: newTitle },
      });

      dispatch(setTitle(newTitle));
      resolve(saveResult);
      this.expectIdChange();
      return saveResult.id ? { id: saveResult.id } : { error: saveResult.error };
    };
    showCloneModal({ onClone, title: currentState.title, onClose: () => resolve(undefined) });
  });
}
