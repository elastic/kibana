/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, merge } from 'rxjs';
import { filter, map, max } from 'lodash';
import { v4 } from 'uuid';
import { asyncForEach } from '@kbn/std';
import type { Reference } from '@kbn/content-management-utils';
import { METRIC_TYPE } from '@kbn/analytics';
import { PanelPackage } from '@kbn/presentation-containers';
import {
  DefaultEmbeddableApi,
  EmbeddablePackageState,
  PanelNotFoundError,
} from '@kbn/embeddable-plugin/public';
import {
  StateComparators,
  apiHasLibraryTransforms,
  apiPublishesTitle,
  apiPublishesUnsavedChanges,
  apiHasSerializableState,
  getTitle,
} from '@kbn/presentation-publishing';
import { i18n } from '@kbn/i18n';
import { coreServices, usageCollectionService } from '../services/kibana_services';
import { DashboardPanelMap, DashboardPanelState, prefixReferencesFromPanel } from '../../common';
import type { initializeTrackPanel } from './track_panel';
import { getPanelAddedSuccessString } from '../dashboard_app/_dashboard_app_strings';
import { runPanelPlacementStrategy } from '../panel_placement/place_new_panel_strategies';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../../common/content_management';
import { DASHBOARD_UI_METRIC_ID } from '../utils/telemetry_constants';
import { getDashboardPanelPlacementSetting } from '../panel_placement/panel_placement_registry';
import { DashboardState, UnsavedPanelState } from './types';
import { arePanelLayoutsEqual } from './are_panel_layouts_equal';
import { dashboardClonePanelActionStrings } from '../dashboard_actions/_dashboard_actions_strings';
import { placeClonePanel } from '../panel_placement/place_clone_panel_strategy';
import { PanelPlacementStrategy } from '../plugin_constants';

export function initializePanelsManager(
  incomingEmbeddable: EmbeddablePackageState | undefined,
  initialPanels: DashboardPanelMap,
  initialPanelsRuntimeState: UnsavedPanelState,
  trackPanel: ReturnType<typeof initializeTrackPanel>,
  getReferencesForPanelId: (id: string) => Reference[],
  pushReferences: (references: Reference[]) => void
) {
  const children$ = new BehaviorSubject<{
    [key: string]: unknown;
  }>({});
  const panels$ = new BehaviorSubject(initialPanels);
  function setPanels(panels: DashboardPanelMap) {
    if (panels !== panels$.value) panels$.next(panels);
  }
  let restoredRuntimeState: UnsavedPanelState = initialPanelsRuntimeState;

  function setRuntimeStateForChild(childId: string, state: object) {
    restoredRuntimeState[childId] = state;
  }

  // --------------------------------------------------------------------------------------
  // Place the incoming embeddable if there is one
  // --------------------------------------------------------------------------------------
  if (incomingEmbeddable) {
    const incomingPanelId = incomingEmbeddable.embeddableId ?? v4();
    let incomingPanelState: DashboardPanelState;
    if (incomingEmbeddable.embeddableId && Boolean(panels$.value[incomingPanelId])) {
      // this embeddable already exists, just update the explicit input.
      incomingPanelState = panels$.value[incomingPanelId];
      const sameType = incomingPanelState.type === incomingEmbeddable.type;

      incomingPanelState.type = incomingEmbeddable.type;
      setRuntimeStateForChild(incomingPanelId, {
        // if the incoming panel is the same type as what was there before we can safely spread the old panel's explicit input
        ...(sameType ? incomingPanelState.explicitInput : {}),

        ...incomingEmbeddable.input,

        // maintain hide panel titles setting.
        hidePanelTitles: (incomingPanelState.explicitInput as { hidePanelTitles?: boolean })
          .hidePanelTitles,
      });
      incomingPanelState.explicitInput = {};
    } else {
      // otherwise this incoming embeddable is brand new.
      setRuntimeStateForChild(incomingPanelId, incomingEmbeddable.input);
      const { newPanelPlacement } = runPanelPlacementStrategy(
        PanelPlacementStrategy.findTopLeftMostOpenSpace,
        {
          width: incomingEmbeddable.size?.width ?? DEFAULT_PANEL_WIDTH,
          height: incomingEmbeddable.size?.height ?? DEFAULT_PANEL_HEIGHT,
          currentPanels: panels$.value,
        }
      );
      incomingPanelState = {
        explicitInput: {},
        type: incomingEmbeddable.type,
        gridData: {
          ...newPanelPlacement,
          i: incomingPanelId,
        },
      };
    }

    setPanels({
      ...panels$.value,
      [incomingPanelId]: incomingPanelState,
    });
    trackPanel.setScrollToPanelId(incomingPanelId);
    trackPanel.setHighlightPanelId(incomingPanelId);
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

  function getDashboardPanelFromId(panelId: string) {
    const panel = panels$.value[panelId];
    const child = children$.value[panelId];
    if (!child || !panel) throw new PanelNotFoundError();
    const serialized = apiHasSerializableState(child) ? child.serializeState() : { rawState: {} };
    return {
      type: panel.type,
      explicitInput: { ...panel.explicitInput, ...serialized.rawState },
      gridData: panel.gridData,
      references: serialized.references,
    };
  }

  async function getPanelTitles(): Promise<string[]> {
    const titles: string[] = [];
    await asyncForEach(Object.keys(panels$.value), async (id) => {
      const childApi = await untilEmbeddableLoaded(id);
      const title = apiPublishesTitle(childApi) ? getTitle(childApi) : '';
      if (title) titles.push(title);
    });
    return titles;
  }

  return {
    api: {
      addNewPanel: async <ApiType extends unknown = unknown>(
        panelPackage: PanelPackage,
        displaySuccessMessage?: boolean
      ) => {
        const { panelType: type, serializedState, initialState } = panelPackage;

        usageCollectionService?.reportUiCounter(DASHBOARD_UI_METRIC_ID, METRIC_TYPE.CLICK, type);

        const newId = v4();

        const getCustomPlacementSettingFunc = getDashboardPanelPlacementSetting(type);

        const customPlacementSettings = getCustomPlacementSettingFunc
          ? await getCustomPlacementSettingFunc(initialState)
          : undefined;

        const { newPanelPlacement, otherPanels } = runPanelPlacementStrategy(
          customPlacementSettings?.strategy ?? PanelPlacementStrategy.findTopLeftMostOpenSpace,
          {
            currentPanels: panels$.value,
            height: customPlacementSettings?.height ?? DEFAULT_PANEL_HEIGHT,
            width: customPlacementSettings?.width ?? DEFAULT_PANEL_WIDTH,
          }
        );

        if (serializedState?.references && serializedState.references.length > 0) {
          pushReferences(prefixReferencesFromPanel(newId, serializedState.references));
        }
        const newPanel: DashboardPanelState = {
          type,
          gridData: {
            ...newPanelPlacement,
            i: newId,
          },
          explicitInput: {
            ...serializedState?.rawState,
          },
        };
        if (initialState) setRuntimeStateForChild(newId, initialState);

        setPanels({ ...otherPanels, [newId]: newPanel });
        if (displaySuccessMessage) {
          coreServices.notifications.toasts.addSuccess({
            title: getPanelAddedSuccessString((newPanel.explicitInput as { title?: string }).title),
            'data-test-subj': 'addEmbeddableToDashboardSuccess',
          });
          trackPanel.setScrollToPanelId(newId);
          trackPanel.setHighlightPanelId(newId);
        }
        return await untilEmbeddableLoaded<ApiType>(newId);
      },
      canRemovePanels: () => trackPanel.expandedPanelId$.value === undefined,
      children$,
      duplicatePanel: async (idToDuplicate: string) => {
        const panelToClone = getDashboardPanelFromId(idToDuplicate);
        const childApi = children$.value[idToDuplicate];
        if (!apiHasSerializableState(childApi)) {
          throw new Error('cannot duplicate a non-serializable panel');
        }

        const id = v4();
        const allPanelTitles = await getPanelTitles();
        const lastTitle = apiPublishesTitle(childApi) ? getTitle(childApi) ?? '' : '';
        const newTitle = getClonedPanelTitle(allPanelTitles, lastTitle);

        /**
         * For embeddables that have library transforms, we need to ensure
         * to clone them with by value serialized state.
         */
        const serializedState = apiHasLibraryTransforms(childApi)
          ? childApi.getSerializedStateByValue()
          : childApi.serializeState();

        if (serializedState.references) {
          pushReferences(prefixReferencesFromPanel(id, serializedState.references));
        }

        coreServices.notifications.toasts.addSuccess({
          title: dashboardClonePanelActionStrings.getSuccessMessage(),
          'data-test-subj': 'addObjectToContainerSuccess',
        });

        const { newPanelPlacement, otherPanels } = placeClonePanel({
          width: panelToClone.gridData.w,
          height: panelToClone.gridData.h,
          currentPanels: panels$.value,
          placeBesideId: idToDuplicate,
        });

        const newPanel = {
          type: panelToClone.type,
          explicitInput: {
            ...serializedState.rawState,
            title: newTitle,
            id,
          },
          gridData: {
            ...newPanelPlacement,
            i: id,
          },
        };

        setPanels({
          ...otherPanels,
          [id]: newPanel,
        });
      },
      getDashboardPanelFromId,
      getPanelCount: () => {
        return Object.keys(panels$.value).length;
      },
      getSerializedStateForChild: (childId: string) => {
        const rawState = panels$.value[childId]?.explicitInput ?? {};
        return Object.keys(rawState).length === 0
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
      replacePanel: async (idToRemove: string, panelPackage: PanelPackage) => {
        const panels = { ...panels$.value };
        if (!panels[idToRemove]) {
          throw new PanelNotFoundError();
        }

        const id = v4();
        const oldPanel = panels[idToRemove];
        delete panels[idToRemove];

        const { panelType: type, serializedState, initialState } = panelPackage;
        if (serializedState?.references && serializedState.references.length > 0) {
          pushReferences(prefixReferencesFromPanel(id, serializedState?.references));
        }

        if (initialState) setRuntimeStateForChild(id, initialState);

        setPanels({
          ...panels,
          [id]: {
            ...oldPanel,
            explicitInput: { ...serializedState?.rawState, id },
            type,
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
      panels: [panels$, setPanels, arePanelLayoutsEqual],
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
            if (apiPublishesUnsavedChanges(child)) {
              const success = child.resetUnsavedChanges();
              if (!success) {
                coreServices.notifications.toasts.addWarning(
                  i18n.translate('dashboard.reset.panelError', {
                    defaultMessage: 'Unable to reset panel changes',
                  })
                );
              }
            }
          } else {
            // if reset resulted in panel removal, we need to update the list of children
            delete currentChildren[panelId];
            resetChangedPanelCount = true;
          }
        }
        if (resetChangedPanelCount) children$.next(currentChildren);
      },
      getState: (): {
        panels: DashboardState['panels'];
        references: Reference[];
      } => {
        const references: Reference[] = [];

        const panels = Object.keys(panels$.value).reduce((acc, id) => {
          const childApi = children$.value[id];
          const serializeResult = apiHasSerializableState(childApi)
            ? childApi.serializeState()
            : { rawState: {} };
          acc[id] = { ...panels$.value[id], explicitInput: { ...serializeResult.rawState, id } };

          references.push(...prefixReferencesFromPanel(id, serializeResult.references ?? []));

          return acc;
        }, {} as DashboardPanelMap);

        return { panels, references };
      },
    },
  };
}

function getClonedPanelTitle(panelTitles: string[], rawTitle: string) {
  if (rawTitle === '') return '';

  const clonedTag = dashboardClonePanelActionStrings.getClonedTag();
  const cloneRegex = new RegExp(`\\(${clonedTag}\\)`, 'g');
  const cloneNumberRegex = new RegExp(`\\(${clonedTag} [0-9]+\\)`, 'g');
  const baseTitle = rawTitle.replace(cloneNumberRegex, '').replace(cloneRegex, '').trim();
  const similarTitles = filter(panelTitles, (title: string) => {
    return title.startsWith(baseTitle);
  });

  const cloneNumbers = map(similarTitles, (title: string) => {
    if (title.match(cloneRegex)) return 0;
    const cloneTag = title.match(cloneNumberRegex);
    return cloneTag ? parseInt(cloneTag[0].replace(/[^0-9.]/g, ''), 10) : -1;
  });
  const similarBaseTitlesCount = max(cloneNumbers) || 0;

  return similarBaseTitlesCount < 0
    ? baseTitle + ` (${clonedTag})`
    : baseTitle + ` (${clonedTag} ${similarBaseTitlesCount + 1})`;
}
