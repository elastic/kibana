/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ViewMode } from "@kbn/presentation-publishing";
import type { Reference } from '@kbn/content-management-utils';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { showSaveModal } from '@kbn/saved-objects-plugin/public';
import { SaveDashboardReturn } from "../services/dashboard_content_management_service/types";
import { DashboardSaveOptions, DashboardStateFromSaveModal } from "../dashboard_container/types";
import { coreServices, dataService, savedObjectsTaggingService } from "../services/kibana_services";
import { getDashboardContentManagementService } from "../services/dashboard_content_management_service";
import { DashboardState } from "./types";
import { DASHBOARD_CONTENT_ID, SAVED_OBJECT_POST_TIME } from "../dashboard_constants";
import { extractTitleAndCount } from "../dashboard_container/embeddable/api/lib/extract_title_and_count";
import { i18n } from "@kbn/i18n";
import { DashboardSaveModal } from "../dashboard_container/embeddable/api/overlays/save_modal";

/**
 * @description exclusively for user directed dashboard save actions, also
 * accounts for scenarios of cloning elastic managed dashboard into user managed dashboards
 */
export async function runInteractiveSave({
  clearOverlays,
  controlGroupReferences,
  dashboardState,
  isManaged,
  lastSavedId,
  panelReferences,
  viewMode,
}: {
  clearOverlays: () => void;
  controlGroupReferences: Reference[];
  dashboardState: DashboardState;
  isManaged: boolean;
  lastSavedId: string | undefined,
  panelReferences: Reference[];
  viewMode: ViewMode;
}) {
  const dashboardContentManagementService = getDashboardContentManagementService();
  return new Promise<SaveDashboardReturn | undefined>((resolve, reject) => {
    if (viewMode === 'edit' && isManaged) {
      resolve(undefined);
    }

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

        const stateFromSaveModal: DashboardStateFromSaveModal = {
          title: newTitle,
          tags: [] as string[],
          description: newDescription,
          timeRestore: newTimeRestore,
          timeRange: newTimeRestore ? dataService.query.timefilter.timefilter.getTime() : undefined,
          refreshInterval: newTimeRestore
            ? dataService.query.timefilter.timefilter.getRefreshInterval()
            : undefined,
        };

        if (savedObjectsTaggingService && newTags) {
          // remove `hasSavedObjectsTagging` once the savedObjectsTagging service is optional
          stateFromSaveModal.tags = newTags;
        }

        let dashboardStateToSave: DashboardState = {
          ...dashboardState,
          ...stateFromSaveModal,
        };

        // TODO If this is a managed dashboard - unlink all by reference embeddables on clone

        const beforeAddTime = window.performance.now();

        const saveResult = await dashboardContentManagementService.saveDashboardState({
          controlGroupReferences,
          panelReferences,
          saveOptions,
          currentState: {
            ...dashboardStateToSave,
            title: newTitle,
          },
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

        if (saveResult.id) {
          batch(() => {
            this.dispatch.setStateFromSaveModal(stateFromSaveModal);
            this.setSavedObjectId(saveResult.id);
            this.setLastSavedInput(dashboardStateToSave);
          });
        }

        this.savedObjectReferences = saveResult.references ?? [];
        this.saveNotification$.next();

        resolve(saveResult);

        return saveResult;
      } catch (error) {
        reject(error);
        return error;
      }
    };

    (async () => {
      try {
        let customModalTitle;
        let newTitle = dashboardState.title;

        if (lastSavedId) {
          const [baseTitle, baseCount] = extractTitleAndCount(newTitle);

          newTitle = `${baseTitle} (${baseCount + 1})`;

          await dashboardContentManagementService.checkForDuplicateDashboardTitle({
            title: newTitle,
            lastSavedTitle: dashboardState.title,
            copyOnSave: true,
            isTitleDuplicateConfirmed: false,
            onTitleDuplicate(speculativeSuggestion) {
              newTitle = speculativeSuggestion;
            },
          });

          switch (viewMode) {
            case 'edit': {
              customModalTitle = i18n.translate(
                'dashboard.topNav.editModeInteractiveSave.modalTitle',
                {
                  defaultMessage: 'Save as new dashboard',
                }
              );
              break;
            }
            case 'view': {
              customModalTitle = i18n.translate(
                'dashboard.topNav.viewModeInteractiveSave.modalTitle',
                {
                  defaultMessage: 'Duplicate dashboard',
                }
              );
              break;
            }
            default: {
              customModalTitle = undefined;
            }
          }
        }

        const dashboardDuplicateModal = (
          <DashboardSaveModal
            tags={dashboardState.tags}
            title={newTitle}
            onClose={() => resolve(undefined)}
            timeRestore={dashboardState.timeRestore}
            showStoreTimeOnSave={!lastSavedId}
            description={dashboardState.description ?? ''}
            showCopyOnSave={false}
            onSave={onSaveAttempt}
            customModalTitle={customModalTitle}
          />
        );
        clearOverlays();
        showSaveModal(dashboardDuplicateModal);
      } catch (error) {
        reject(error);
      }
    })();
  });
}