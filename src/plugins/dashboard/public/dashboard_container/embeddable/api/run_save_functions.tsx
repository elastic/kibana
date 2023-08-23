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
import { DASHBOARD_CONTENT_ID, SAVED_OBJECT_POST_TIME } from '../../../dashboard_constants';
import { DashboardSaveOptions, DashboardStateFromSaveModal } from '../../types';
import { DashboardSaveModal } from './overlays/save_modal';
import { DashboardContainer } from '../dashboard_container';
import { pluginServices } from '../../../services/plugin_services';
import { DashboardContainerInput } from '../../../../common';
import { SaveDashboardReturn } from '../../../services/dashboard_content_management/types';
import { extractTitleAndCount } from './lib/extract_title_and_count';

export function runSaveAs(this: DashboardContainer) {
  const {
    data: {
      query: {
        timefilter: { timefilter },
      },
    },
    savedObjectsTagging: { hasApi: hasSavedObjectsTagging },
    dashboardContentManagement: { checkForDuplicateDashboardTitle, saveDashboardState },
  } = pluginServices.getServices();

  const {
    explicitInput: currentState,
    componentState: { lastSavedId },
  } = this.getState();

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
      const stateToSave: DashboardContainerInput = {
        ...currentState,
        ...stateFromSaveModal,
      };
      const beforeAddTime = window.performance.now();
      const saveResult = await saveDashboardState({
        currentState: stateToSave,
        saveOptions,
        lastSavedId,
      });
      const addDuration = window.performance.now() - beforeAddTime;
      reportPerformanceMetricEvent(pluginServices.getServices().analytics, {
        eventName: SAVED_OBJECT_POST_TIME,
        duration: addDuration,
        meta: {
          saved_object_type: DASHBOARD_CONTENT_ID,
        },
      });

      stateFromSaveModal.lastSavedId = saveResult.id;
      if (saveResult.id) {
        batch(() => {
          this.dispatch.setStateFromSaveModal(stateFromSaveModal);
          this.dispatch.setLastSavedInput(stateToSave);
        });
      }
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
    showSaveModal(dashboardSaveModal);
  });
}

/**
 * Save the current state of this dashboard to a saved object without showing any save modal.
 */
export async function runQuickSave(this: DashboardContainer) {
  const {
    dashboardContentManagement: { saveDashboardState },
  } = pluginServices.getServices();

  const {
    explicitInput: currentState,
    componentState: { lastSavedId },
  } = this.getState();

  const saveResult = await saveDashboardState({
    lastSavedId,
    currentState,
    saveOptions: {},
  });
  this.dispatch.setLastSavedInput(currentState);

  return saveResult;
}

export async function runClone(this: DashboardContainer) {
  const {
    dashboardContentManagement: { saveDashboardState, checkForDuplicateDashboardTitle },
  } = pluginServices.getServices();

  const { explicitInput: currentState } = this.getState();

  return new Promise<SaveDashboardReturn | undefined>(async (resolve, reject) => {
    try {
      const [baseTitle, baseCount] = extractTitleAndCount(currentState.title);
      let copyCount = baseCount;
      let newTitle = `${baseTitle} (${copyCount})`;
      while (
        !(await checkForDuplicateDashboardTitle({
          title: newTitle,
          lastSavedTitle: currentState.title,
          copyOnSave: true,
          isTitleDuplicateConfirmed: false,
        }))
      ) {
        copyCount++;
        newTitle = `${baseTitle} (${copyCount})`;
      }
      const saveResult = await saveDashboardState({
        saveOptions: {
          saveAsCopy: true,
        },
        currentState: {
          ...currentState,
          title: newTitle,
        },
      });
      resolve(saveResult);
      return saveResult.id
        ? {
            id: saveResult.id,
          }
        : {
            error: saveResult.error,
          };
    } catch (error) {
      reject(error);
    }
  });
}
