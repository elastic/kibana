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
import type { Reference } from '@kbn/content-management-utils';
import { METRIC_TYPE } from '@kbn/analytics';
import { PanelPackage } from '@kbn/presentation-containers';
import { PanelNotFoundError } from '@kbn/embeddable-plugin/public';
import { coreServices, usageCollectionService } from '../services/kibana_services';
import { DashboardPanelMap, DashboardPanelState } from '../../common';
import { getReferencesForPanelId } from '../../common/dashboard_container/persistable_state/dashboard_container_references';
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

export function initializePanelsManager(
  initialPanels: DashboardPanelMap,
  initialReferences: Reference[],
  trackPanel: ReturnType<typeof initializeTrackPanel>
) {
  const children$ = new BehaviorSubject<{
    [key: string]: unknown;
  }>({});
  const panels$ = new BehaviorSubject(initialPanels);
  let references: Reference[] = initialReferences;
  const restoredRuntimeState: UnsavedPanelState = {};

  function setRuntimeStateForChild(childId: string, state: object) {
    restoredRuntimeState[childId] = state;
  }

  async function untilReactEmbeddableLoaded<ApiType>(id: string): Promise<ApiType | undefined> {
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
      panels$.next({ ...otherPanels, [newId]: newPanel });
      if (displaySuccessMessage) {
        coreServices.notifications.toasts.addSuccess({
          title: getPanelAddedSuccessString(newPanel.explicitInput.title),
          'data-test-subj': 'addEmbeddableToDashboardSuccess',
        });
        trackPanel.setScrollToPanelId(newId);
        trackPanel.setHighlightPanelId(newId);
      }
      return await untilReactEmbeddableLoaded<ApiType>(newId);
    },
    children$,
    getSerializedStateForChild: (childId: string) => {
      const rawState = panels$.value[childId]?.explicitInput ?? { id: childId };
      const { id, ...serializedState } = rawState;
      return Object.keys(serializedState).length === 0
        ? undefined
        : {
            rawState,
            references: getReferencesForPanelId(childId, references),
          };
    },
    getRuntimeStateForChild: (childId: string) => {
      return restoredRuntimeState?.[childId];
    },
    panels$,
    references,
    setPanels: (panels: DashboardPanelMap) => {
      panels$.next(panels);
    },
    setReferences: (nextReferences: Reference[]) => (references = nextReferences),
    setRuntimeStateForChild,
  };
}
