/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, merge } from 'rxjs';
import { v4 } from 'uuid';
import fastIsEqual from 'fast-deep-equal';
import type { Reference } from '@kbn/content-management-utils';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  PanelPackage,
  SerializedPanelState,
  apiHasSerializableState,
} from '@kbn/presentation-containers';
import { DefaultEmbeddableApi, PanelNotFoundError } from '@kbn/embeddable-plugin/public';
import { StateComparators, apiPublishesUnsavedChanges } from '@kbn/presentation-publishing';
import { cloneDeep } from 'lodash';
import { coreServices, usageCollectionService } from '../services/kibana_services';
import { DashboardPanelMap, DashboardPanelState, prefixReferencesFromPanel } from '../../common';
import type { initializeTrackPanel } from './track_panel';
import { getPanelAddedSuccessString } from '../dashboard_app/_dashboard_app_strings';
import { runPanelPlacementStrategy } from '../dashboard_container/panel_placement/place_new_panel_strategies';
import {
  DASHBOARD_UI_METRIC_ID,
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_PANEL_WIDTH,
  PanelPlacementStrategy,
} from '../dashboard_constants';
import { getDashboardPanelPlacementSetting } from '../dashboard_container/panel_placement/panel_placement_registry';
import { UnsavedPanelState } from '../dashboard_container/types';
import { DashboardState } from './types';
import { arePanelLayoutsEqual } from './are_panel_layouts_equal';

export function initializePanelsManager(
  initialPanels: DashboardPanelMap,
  trackPanel: ReturnType<typeof initializeTrackPanel>,
  getReferencesForPanelId: (id: string) => Reference[]
) {
  const children$ = new BehaviorSubject<{
    [key: string]: unknown;
  }>({});
  const panels$ = new BehaviorSubject(initialPanels);
  function setPanels(panels: DashboardPanelMap) {
    if (panels !== panels$.value) panels$.next(panels);
  }
  let restoredRuntimeState: UnsavedPanelState = {};

  function setRuntimeStateForChild(childId: string, state: object) {
    restoredRuntimeState[childId] = state;
  }

  async function untilEmbeddableLoaded<ApiType>(id: string): Promise<ApiType | undefined> {
    if (!panels$.value[id]) {
      throw new PanelNotFoundError();
    }

    if (children$.value[id]) {
      return children$.value[id] as ApiType;
    }

    return new Promise((resolve, reject) => {
      const subscription = merge(children$, panels$).subscribe(() => {
        if (children$.value[id]) {
          subscription.unsubscribe();
          resolve(children$.value[id] as ApiType);
        }

        // If we hit this, the panel was removed before the embeddable finished loading.
        if (panels$.value[id] === undefined) {
          subscription.unsubscribe();
          resolve(undefined);
        }
      });
    });
  }

  return {
    api: {
      addNewPanel: async <ApiType extends unknown = unknown>(
        panelPackage: PanelPackage,
        displaySuccessMessage?: boolean
      ) => {
        usageCollectionService?.reportUiCounter(
          DASHBOARD_UI_METRIC_ID,
          METRIC_TYPE.CLICK,
          panelPackage.panelType
        );

        const newId = v4();

        const getCustomPlacementSettingFunc = getDashboardPanelPlacementSetting(
          panelPackage.panelType
        );

        const customPlacementSettings = getCustomPlacementSettingFunc
          ? await getCustomPlacementSettingFunc(panelPackage.initialState)
          : undefined;

        const { newPanelPlacement, otherPanels } = runPanelPlacementStrategy(
          customPlacementSettings?.strategy ?? PanelPlacementStrategy.findTopLeftMostOpenSpace,
          {
            currentPanels: panels$.value,
            height: customPlacementSettings?.height ?? DEFAULT_PANEL_HEIGHT,
            width: customPlacementSettings?.width ?? DEFAULT_PANEL_WIDTH,
          }
        );
        const newPanel: DashboardPanelState = {
          type: panelPackage.panelType,
          gridData: {
            ...newPanelPlacement,
            i: newId,
          },
          explicitInput: {
            id: newId,
          },
        };
        if (panelPackage.initialState) {
          setRuntimeStateForChild(newId, panelPackage.initialState);
        }
        setPanels({ ...otherPanels, [newId]: newPanel });
        if (displaySuccessMessage) {
          coreServices.notifications.toasts.addSuccess({
            title: getPanelAddedSuccessString(newPanel.explicitInput.title),
            'data-test-subj': 'addEmbeddableToDashboardSuccess',
          });
          trackPanel.setScrollToPanelId(newId);
          trackPanel.setHighlightPanelId(newId);
        }
        return await untilEmbeddableLoaded<ApiType>(newId);
      },
      canRemovePanels: () => trackPanel.expandedPanelId.value === undefined,
      children$,
      getDashboardPanelFromId: async (panelId: string) => {
        const panel = panels$.value[panelId];
        const child = children$.value[panelId];
        if (!child || !panel) throw new PanelNotFoundError();
        const serialized = apiHasSerializableState(child)
          ? await child.serializeState()
          : { rawState: {} };
        return {
          type: panel.type,
          explicitInput: { ...panel.explicitInput, ...serialized.rawState },
          gridData: panel.gridData,
          references: serialized.references,
        };
      },
      getPanelCount: () => {
        return Object.keys(panels$.value).length;
      },
      getSerializedStateForChild: (childId: string) => {
        const rawState = panels$.value[childId]?.explicitInput ?? { id: childId };
        const { id, ...serializedState } = rawState;
        return Object.keys(serializedState).length === 0
          ? undefined
          : {
              rawState,
              references: getReferencesForPanelId(childId),
            };
      },
      getRuntimeStateForChild: (childId: string) => {
        return restoredRuntimeState?.[childId];
      },
      panels$,
      removePanel: (id: string) => {
        const panels = { ...panels$.value };
        if (panels[id]) {
          delete panels[id];
          setPanels(panels);
        }
        const children = { ...children$.value };
        if (children[id]) {
          delete children[id];
          children$.next(children);
        }
      },
      replacePanel: async (idToRemove: string, { panelType, initialState }: PanelPackage) => {
        const panels = { ...panels$.value };
        if (!panels[idToRemove]) {
          throw new PanelNotFoundError();
        }

        const id = v4();
        const oldPanel = panels[idToRemove];
        delete panels[idToRemove];
        setPanels({
          ...panels,
          [id]: {
            ...oldPanel,
            explicitInput: { ...initialState, id },
            type: panelType,
          },
        });

        const children = { ...children$.value };
        if (children[idToRemove]) {
          delete children[idToRemove];
          children$.next(children);
        }

        await untilEmbeddableLoaded(id);
        return id;
      },
      setPanels,
      setRuntimeStateForChild,
      untilEmbeddableLoaded,
    },
    comparators: {
      panels: [
        panels$,
        setPanels,
        arePanelLayoutsEqual,
      ],
    } as StateComparators<Pick<DashboardState, 'panels'>>,
    internalApi: {
      registerChildApi: (api: DefaultEmbeddableApi) => {
        children$.next({
          ...children$.value,
          [api.uuid]: api,
        });
      },
      reset: (lastSavedState: DashboardState) => {
        setPanels(lastSavedState.panels);
        restoredRuntimeState = {};
        let resetChangedPanelCount = false;
        const currentChildren = children$.value;
        for (const panelId of Object.keys(currentChildren)) {
          if (panels$.value[panelId]) {
            const child = currentChildren[panelId];
            if (apiPublishesUnsavedChanges(child)) child.resetUnsavedChanges();
          } else {
            // if reset resulted in panel removal, we need to update the list of children
            delete currentChildren[panelId];
            resetChangedPanelCount = true;
          }
        }
        if (resetChangedPanelCount) children$.next(currentChildren);
      },
      getState: async (): Promise<{
        panels: DashboardState['panels'];
        references: Reference[];
      }> => {
        const references: Reference[] = [];
        const panels = cloneDeep(panels$.value);

        const serializePromises: Array<
          Promise<{ uuid: string; serialized: SerializedPanelState<object> }>
        > = [];
        for (const uuid of Object.keys(panels)) {
          const api = children$.value[uuid];

          if (apiHasSerializableState(api)) {
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
          references.push(
            ...prefixReferencesFromPanel(result.uuid, result.serialized.references ?? [])
          );
        }

        return { panels, references };
      },
    },
  };
}
