/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardContainer } from '../dashboard_container';
import { pluginServices } from '../../../services/plugin_services';
import { SaveDashboardReturn } from '../../../services/dashboard_content_management/types';
import { extractTitleAndCount } from './lib/extract_title_and_count';

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
