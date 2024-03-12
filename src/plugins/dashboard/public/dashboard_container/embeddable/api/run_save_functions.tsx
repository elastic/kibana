/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reference } from '@kbn/content-management-utils';
import type { PersistableControlGroupInput } from '@kbn/controls-plugin/common';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import {
  EmbeddableInput,
  isReferenceOrValueEmbeddable,
  reactEmbeddableRegistryHasKey,
} from '@kbn/embeddable-plugin/public';
import { showSaveModal } from '@kbn/saved-objects-plugin/public';
import { cloneDeep } from 'lodash';
import React from 'react';
import { batch } from 'react-redux';
import { DashboardContainerInput, DashboardPanelMap } from '../../../../common';
import { prefixReferencesFromPanel } from '../../../../common/dashboard_container/persistable_state/dashboard_container_references';
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
  const references: Reference[] = [];
  const panels = cloneDeep(dashboard.getInput().panels);
  for (const [uuid, panel] of Object.entries(panels)) {
    if (!reactEmbeddableRegistryHasKey(panel.type)) continue;
    const api = dashboard.reactEmbeddableChildren.value[uuid];
    if (api) {
      const serializedState = api.serializeState();
      panels[uuid].explicitInput = { ...serializedState.rawState, id: uuid };
      references.push(...prefixReferencesFromPanel(uuid, serializedState.references ?? []));
    }
  }
  return { panels, references };
};

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
    componentState: { lastSavedId, managed },
  } = this.getState();

  return new Promise<SaveDashboardReturn | undefined>((resolve) => {
    if (managed) resolve(undefined);
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
      const { panels: nextPanels, references } = await serializeAllPanelState(this);
      const dashboardStateToSave: DashboardContainerInput = {
        ...currentState,
        panels: nextPanels,
        ...stateFromSaveModal,
      };
      let stateToSave: SavedDashboardInput = dashboardStateToSave;
      let persistableControlGroupInput: PersistableControlGroupInput | undefined;
      if (this.controlGroup) {
        persistableControlGroupInput = this.controlGroup.getPersistableInput();
        stateToSave = { ...stateToSave, controlGroupInput: persistableControlGroupInput };
      }
      const beforeAddTime = window.performance.now();

      const saveResult = await saveDashboardState({
        panelReferences: references,
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
          this.dispatch.setLastSavedInput(dashboardStateToSave);
          if (this.controlGroup && persistableControlGroupInput) {
            this.controlGroup.setSavedState(persistableControlGroupInput);
          }
        });
      }
      this.savedObjectReferences = saveResult.references ?? [];
      this.lastSavedState.next();
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
  this.lastSavedState.next();
  if (this.controlGroup && persistableControlGroupInput) {
    this.controlGroup.setSavedState(persistableControlGroupInput);
  }

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

      let stateToSave: DashboardContainerInput & {
        controlGroupInput?: PersistableControlGroupInput;
      } = currentState;
      if (this.controlGroup) {
        stateToSave = {
          ...stateToSave,
          controlGroupInput: this.controlGroup.getPersistableInput(),
        };
      }

      const isManaged = this.getState().componentState.managed;
      const newPanels = await (async () => {
        if (!isManaged) return currentState.panels;

        // this is a managed dashboard - unlink all by reference embeddables on clone
        const unlinkedPanels: DashboardPanelMap = {};
        for (const [panelId, panel] of Object.entries(currentState.panels)) {
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

      const saveResult = await saveDashboardState({
        saveOptions: {
          saveAsCopy: true,
        },
        currentState: {
          ...stateToSave,
          panels: newPanels,
          title: newTitle,
        },
      });
      this.savedObjectReferences = saveResult.references ?? [];
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
