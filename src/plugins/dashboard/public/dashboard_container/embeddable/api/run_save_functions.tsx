/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Reference } from '@kbn/content-management-utils';
import type { PersistableControlGroupInput } from '@kbn/controls-plugin/common';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import {
  EmbeddableInput,
  isReferenceOrValueEmbeddable,
  ViewMode,
} from '@kbn/embeddable-plugin/public';
import { apiHasSerializableState, SerializedPanelState } from '@kbn/presentation-containers';
import { showSaveModal } from '@kbn/saved-objects-plugin/public';
import { cloneDeep } from 'lodash';
import React from 'react';
import { batch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import {
  DashboardContainerInput,
  DashboardPanelMap,
  prefixReferencesFromPanel,
} from '../../../../common';
import { DASHBOARD_CONTENT_ID, SAVED_OBJECT_POST_TIME } from '../../../dashboard_constants';
import {
  SaveDashboardReturn,
  SavedDashboardInput,
} from '../../../services/dashboard_content_management/types';
import { pluginServices } from '../../../services/plugin_services';
import { DashboardSaveOptions, DashboardStateFromSaveModal } from '../../types';
import { DashboardContainer } from '../dashboard_container';
import { extractTitleAndCount } from './lib/extract_title_and_count';
import { DashboardSaveModal } from './overlays/save_modal';

const serializeAllPanelState = async (
  dashboard: DashboardContainer
): Promise<{ panels: DashboardContainerInput['panels']; references: Reference[] }> => {
  const {
    embeddable: { reactEmbeddableRegistryHasKey },
  } = pluginServices.getServices();
  const references: Reference[] = [];
  const panels = cloneDeep(dashboard.getInput().panels);

  const serializePromises: Array<
    Promise<{ uuid: string; serialized: SerializedPanelState<object> }>
  > = [];
  for (const [uuid, panel] of Object.entries(panels)) {
    if (!reactEmbeddableRegistryHasKey(panel.type)) continue;
    const api = dashboard.children$.value[uuid];

    if (api && apiHasSerializableState(api)) {
      serializePromises.push(
        (async () => {
          const serialized = await api.serializeState();
          return { uuid, serialized };
        })()
      );
    }
  }

  const serializeResults = await Promise.all(serializePromises);
  for (const result of serializeResults) {
    panels[result.uuid].explicitInput = { ...result.serialized.rawState, id: result.uuid };
    references.push(...prefixReferencesFromPanel(result.uuid, result.serialized.references ?? []));
  }

  return { panels, references };
};

/**
 * Save the current state of this dashboard to a saved object without showing any save modal.
 */
export async function runQuickSave(this: DashboardContainer) {
  const {
    dashboardContentManagement: { saveDashboardState },
  } = pluginServices.getServices();

  const {
    explicitInput: currentState,
    componentState: { lastSavedId, managed },
  } = this.getState();

  if (managed) return;

  const { panels: nextPanels, references } = await serializeAllPanelState(this);
  const dashboardStateToSave: DashboardContainerInput = { ...currentState, panels: nextPanels };
  let stateToSave: SavedDashboardInput = dashboardStateToSave;
  let persistableControlGroupInput: PersistableControlGroupInput | undefined;
  if (this.controlGroup) {
    persistableControlGroupInput = this.controlGroup.getPersistableInput();
    stateToSave = { ...stateToSave, controlGroupInput: persistableControlGroupInput };
  }

  const saveResult = await saveDashboardState({
    panelReferences: references,
    currentState: stateToSave,
    saveOptions: {},
    lastSavedId,
  });

  this.savedObjectReferences = saveResult.references ?? [];
  this.dispatch.setLastSavedInput(dashboardStateToSave);
  this.saveNotification$.next();
  if (this.controlGroup && persistableControlGroupInput) {
    this.controlGroup.setSavedState(persistableControlGroupInput);
  }

  return saveResult;
}

/**
 * @description exclusively for user directed dashboard save actions, also
 * accounts for scenarios of cloning elastic managed dashboard into user managed dashboards
 */
export async function runInteractiveSave(this: DashboardContainer, interactionMode: ViewMode) {
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
    componentState: { lastSavedId, managed },
  } = this.getState();

  return new Promise<SaveDashboardReturn | undefined>((resolve, reject) => {
    if (interactionMode === ViewMode.EDIT && managed) {
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
          !(await checkForDuplicateDashboardTitle({
            title: newTitle,
            onTitleDuplicate,
            lastSavedTitle: currentState.title,
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
          timeRange: newTimeRestore ? timefilter.getTime() : undefined,
          refreshInterval: newTimeRestore ? timefilter.getRefreshInterval() : undefined,
        };

        if (hasSavedObjectsTagging && newTags) {
          // remove `hasSavedObjectsTagging` once the savedObjectsTagging service is optional
          stateFromSaveModal.tags = newTags;
        }

        let dashboardStateToSave: DashboardContainerInput & {
          controlGroupInput?: PersistableControlGroupInput;
        } = {
          ...currentState,
          ...stateFromSaveModal,
        };

        let persistableControlGroupInput: PersistableControlGroupInput | undefined;
        if (this.controlGroup) {
          persistableControlGroupInput = this.controlGroup.getPersistableInput();
          dashboardStateToSave = {
            ...dashboardStateToSave,
            controlGroupInput: persistableControlGroupInput,
          };
        }

        const { panels: nextPanels, references } = await serializeAllPanelState(this);

        const newPanels = await (async () => {
          if (!managed) return nextPanels;

          // this is a managed dashboard - unlink all by reference embeddables on clone
          const unlinkedPanels: DashboardPanelMap = {};
          for (const [panelId, panel] of Object.entries(nextPanels)) {
            const child = this.getChild(panelId);
            if (
              child &&
              isReferenceOrValueEmbeddable(child) &&
              child.inputIsRefType(child.getInput() as EmbeddableInput)
            ) {
              const valueTypeInput = await child.getInputAsValueType();
              unlinkedPanels[panelId] = {
                ...panel,
                explicitInput: valueTypeInput,
              };
              continue;
            }
            unlinkedPanels[panelId] = panel;
          }
          return unlinkedPanels;
        })();

        const beforeAddTime = window.performance.now();

        const saveResult = await saveDashboardState({
          panelReferences: references,
          saveOptions,
          currentState: {
            ...dashboardStateToSave,
            panels: newPanels,
            title: newTitle,
          },
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
            this.dispatch.setLastSavedInput(dashboardStateToSave);
            if (this.controlGroup && persistableControlGroupInput) {
              this.controlGroup.setSavedState(persistableControlGroupInput);
            }
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
        let newTitle = currentState.title;

        if (lastSavedId) {
          const [baseTitle, baseCount] = extractTitleAndCount(newTitle);

          newTitle = `${baseTitle} (${baseCount + 1})`;

          await checkForDuplicateDashboardTitle({
            title: newTitle,
            lastSavedTitle: currentState.title,
            copyOnSave: true,
            isTitleDuplicateConfirmed: false,
            onTitleDuplicate(speculativeSuggestion) {
              newTitle = speculativeSuggestion;
            },
          });

          switch (interactionMode) {
            case ViewMode.EDIT: {
              customModalTitle = i18n.translate(
                'dashboard.topNav.editModeInteractiveSave.modalTitle',
                {
                  defaultMessage: 'Save as new dashboard',
                }
              );
              break;
            }
            case ViewMode.VIEW: {
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
            tags={currentState.tags}
            title={newTitle}
            onClose={() => resolve(undefined)}
            timeRestore={currentState.timeRestore}
            showStoreTimeOnSave={!lastSavedId}
            description={currentState.description ?? ''}
            showCopyOnSave={false}
            onSave={onSaveAttempt}
            customModalTitle={customModalTitle}
          />
        );
        this.clearOverlays();
        showSaveModal(dashboardDuplicateModal);
      } catch (error) {
        reject(error);
      }
    })();
  });
}
