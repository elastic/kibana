/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ViewMode } from '@kbn/presentation-publishing';
import type { Reference } from '@kbn/content-management-utils';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { showSaveModal } from '@kbn/saved-objects-plugin/public';
import { i18n } from '@kbn/i18n';
import { SaveDashboardReturn } from '../../services/dashboard_content_management_service/types';
import { DashboardSaveOptions } from './types';
import {
  coreServices,
  dataService,
  savedObjectsTaggingService,
} from '../../services/kibana_services';
import { getDashboardContentManagementService } from '../../services/dashboard_content_management_service';
import { DashboardState } from '../../../common';
import { DASHBOARD_CONTENT_ID, SAVED_OBJECT_POST_TIME } from '../../utils/telemetry_constants';
import { extractTitleAndCount } from '../../utils/extract_title_and_count';
import { DashboardSaveModal } from './save_modal';

/**
 * @description exclusively for user directed dashboard save actions, also
 * accounts for scenarios of cloning elastic managed dashboard into user managed dashboards
 */
export async function openSaveModal({
  controlGroupReferences,
  dashboardState,
  isManaged,
  lastSavedId,
  panelReferences,
  searchSourceReferences,
  viewMode,
}: {
  controlGroupReferences?: Reference[];
  dashboardState: DashboardState;
  isManaged: boolean;
  lastSavedId: string | undefined;
  panelReferences: Reference[];
  searchSourceReferences: Reference[];
  viewMode: ViewMode;
}) {
  if (viewMode === 'edit' && isManaged) {
    return undefined;
  }
  const dashboardContentManagementService = getDashboardContentManagementService();
  const saveAsTitle = lastSavedId
    ? await getSaveAsTitle(dashboardState.title)
    : dashboardState.title;
  return new Promise<(SaveDashboardReturn & { savedState: DashboardState }) | undefined>(
    (resolve, reject) => {
      const onSaveAttempt = async ({
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
          saveAsCopy: lastSavedId ? true : newCopyOnSave,
        };

        try {
          if (
            !(await dashboardContentManagementService.checkForDuplicateDashboardTitle({
              title: newTitle,
              onTitleDuplicate,
              lastSavedTitle: dashboardState.title,
              copyOnSave: saveOptions.saveAsCopy,
              isTitleDuplicateConfirmed,
            }))
          ) {
            return {};
          }

          const dashboardStateToSave: DashboardState = {
            ...dashboardState,
            title: newTitle,
            tags: savedObjectsTaggingService && newTags ? newTags : ([] as string[]),
            description: newDescription,
            timeRestore: newTimeRestore,
            timeRange: newTimeRestore
              ? dataService.query.timefilter.timefilter.getTime()
              : undefined,
            refreshInterval: newTimeRestore
              ? dataService.query.timefilter.timefilter.getRefreshInterval()
              : undefined,
          };

          // TODO If this is a managed dashboard - unlink all by reference embeddables on clone
          // https://github.com/elastic/kibana/issues/190138

          const beforeAddTime = window.performance.now();

          const saveResult = await dashboardContentManagementService.saveDashboardState({
            controlGroupReferences,
            panelReferences,
            searchSourceReferences,
            saveOptions,
            dashboardState: dashboardStateToSave,
            lastSavedId,
          });

          const addDuration = window.performance.now() - beforeAddTime;

          reportPerformanceMetricEvent(coreServices.analytics, {
            eventName: SAVED_OBJECT_POST_TIME,
            duration: addDuration,
            meta: {
              saved_object_type: DASHBOARD_CONTENT_ID,
            },
          });

          resolve({ ...saveResult, savedState: dashboardStateToSave });
          return saveResult;
        } catch (error) {
          reject(error);
          return error;
        }
      };

      showSaveModal(
        <DashboardSaveModal
          tags={dashboardState.tags}
          title={saveAsTitle}
          onClose={() => resolve(undefined)}
          timeRestore={dashboardState.timeRestore}
          showStoreTimeOnSave={!lastSavedId}
          description={dashboardState.description ?? ''}
          showCopyOnSave={false}
          onSave={onSaveAttempt}
          customModalTitle={getCustomModalTitle(viewMode)}
        />
      );
    }
  );
}

function getCustomModalTitle(viewMode: ViewMode) {
  if (viewMode === 'edit')
    return i18n.translate('dashboard.topNav.editModeInteractiveSave.modalTitle', {
      defaultMessage: 'Save as new dashboard',
    });

  if (viewMode === 'view')
    return i18n.translate('dashboard.topNav.viewModeInteractiveSave.modalTitle', {
      defaultMessage: 'Duplicate dashboard',
    });
  return undefined;
}

async function getSaveAsTitle(title: string) {
  const [baseTitle, baseCount] = extractTitleAndCount(title);
  let saveAsTitle = `${baseTitle} (${baseCount + 1})`;
  await getDashboardContentManagementService().checkForDuplicateDashboardTitle({
    title: saveAsTitle,
    lastSavedTitle: title,
    copyOnSave: true,
    isTitleDuplicateConfirmed: false,
    onTitleDuplicate(speculativeSuggestion) {
      saveAsTitle = speculativeSuggestion;
    },
  });

  return saveAsTitle;
}
