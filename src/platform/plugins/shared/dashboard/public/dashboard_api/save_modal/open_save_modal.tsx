/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { Reference } from '@kbn/content-management-utils';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { showSaveModal } from '@kbn/saved-objects-plugin/public';
import { i18n } from '@kbn/i18n';
import type { DashboardSaveOptions, SaveDashboardReturn } from './types';
import { coreServices, savedObjectsTaggingService } from '../../services/kibana_services';
import type { DashboardState } from '../../../common';
import { SAVED_OBJECT_POST_TIME } from '../../utils/telemetry_constants';
import { extractTitleAndCount } from '../../utils/extract_title_and_count';
import { DashboardSaveModal } from './save_modal';
import { checkForDuplicateDashboardTitle } from '../../dashboard_client';
import { saveDashboard } from './save_dashboard';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../common/constants';

/**
 * @description exclusively for user directed dashboard save actions, also
 * accounts for scenarios of cloning elastic managed dashboard into user managed dashboards
 */
export async function openSaveModal({
  description,
  isManaged,
  lastSavedId,
  serializeState,
  setTimeRestore,
  tags,
  timeRestore,
  title,
  viewMode,
}: {
  description?: string;
  isManaged: boolean;
  lastSavedId: string | undefined;
  serializeState: () => { dashboardState: DashboardState; references: Reference[] };
  setTimeRestore: (timeRestore: boolean) => void;
  tags?: string[];
  timeRestore: boolean;
  title: string;
  viewMode: ViewMode;
}) {
  try {
    if (viewMode === 'edit' && isManaged) {
      return undefined;
    }
    const saveAsTitle = lastSavedId ? await getSaveAsTitle(title) : title;
    return new Promise<(SaveDashboardReturn & { savedState: DashboardState }) | undefined>(
      (resolve) => {
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
              !(await checkForDuplicateDashboardTitle({
                title: newTitle,
                onTitleDuplicate,
                lastSavedTitle: title,
                copyOnSave: saveOptions.saveAsCopy,
                isTitleDuplicateConfirmed,
              }))
            ) {
              return {};
            }

            setTimeRestore(newTimeRestore);
            const { dashboardState, references } = serializeState();

            const dashboardStateToSave: DashboardState = {
              ...dashboardState,
              title: newTitle,
              tags: savedObjectsTaggingService && newTags ? newTags : ([] as string[]),
              description: newDescription,
            };

            // TODO If this is a managed dashboard - unlink all by reference embeddables on clone
            // https://github.com/elastic/kibana/issues/190138

            const beforeAddTime = window.performance.now();

            const saveResult = await saveDashboard({
              references,
              saveOptions,
              dashboardState: dashboardStateToSave,
              lastSavedId,
            });

            const addDuration = window.performance.now() - beforeAddTime;

            reportPerformanceMetricEvent(coreServices.analytics, {
              eventName: SAVED_OBJECT_POST_TIME,
              duration: addDuration,
              meta: {
                saved_object_type: DASHBOARD_SAVED_OBJECT_TYPE,
              },
            });

            resolve({ ...saveResult, savedState: dashboardStateToSave });
            return saveResult;
          } catch (error) {
            coreServices.notifications.toasts.addDanger(
              generateDashboardNotSavedToast(title, error.message)
            );
            return error;
          }
        };

        showSaveModal(
          <DashboardSaveModal
            tags={tags}
            title={saveAsTitle}
            onClose={() => resolve(undefined)}
            timeRestore={timeRestore}
            showStoreTimeOnSave={!lastSavedId}
            description={description ?? ''}
            showCopyOnSave={false}
            onSave={onSaveAttempt}
            customModalTitle={getCustomModalTitle(viewMode)}
          />
        );
      }
    );
  } catch (error) {
    coreServices.notifications.toasts.addDanger(
      generateDashboardNotSavedToast(title, error.message)
    );
    return undefined;
  }
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

function generateDashboardNotSavedToast(title: string, errorMessage: any) {
  return {
    title: i18n.translate('dashboard.dashboardWasNotSavedDangerMessage', {
      defaultMessage: `Dashboard ''{title}'' was not saved. Error: {errorMessage}`,
      values: {
        title,
        errorMessage,
      },
    }),
    'data-test-subj': 'saveDashboardFailure',
  };
}

async function getSaveAsTitle(title: string) {
  const [baseTitle, baseCount] = extractTitleAndCount(title);
  let saveAsTitle = `${baseTitle} (${baseCount + 1})`;
  await checkForDuplicateDashboardTitle({
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
