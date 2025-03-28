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
  SerializedPanelState,
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
import { DashboardChildState, DashboardChildren, DashboardLayout, DashboardState } from './types';
import { arePanelLayoutsEqual } from './are_panel_layouts_equal';
import { dashboardClonePanelActionStrings } from '../dashboard_actions/_dashboard_actions_strings';
import { placeClonePanel } from '../panel_placement/place_clone_panel_strategy';
import { PanelPlacementStrategy } from '../plugin_constants';
import type { GridData } from '../../server/content_management';

export function initializePanelsManager(
  incomingEmbeddable: EmbeddablePackageState | undefined,
  initialPanels: DashboardPanelMap,
  trackPanel: ReturnType<typeof initializeTrackPanel>,
  getReferencesForPanelId: (id: string) => Reference[],
  pushReferences: (references: Reference[]) => void
) {
  // --------------------------------------------------------------------------------------
  // Helper functions
  // --------------------------------------------------------------------------------------
  const splitPanelsMap = (panelMap: DashboardPanelMap) => {
    const layout: DashboardLayout = {};
    const childState: DashboardChildState = {};
    Object.keys(panelMap).forEach((uuid) => {
      const { gridData, explicitInput } = panelMap[uuid];
      layout[uuid] = gridData;
      childState[uuid] = {
        rawState: explicitInput, // TODO rename explicitInput to "state". explicitInput is a holdover from the legacy embeddable system.
        references: getReferencesForPanelId(uuid),
      };
    });
    return { layout, childState };
  };

  // --------------------------------------------------------------------------------------
  // Set up panel state management
  // --------------------------------------------------------------------------------------
  const { layout: initialLayout, childState: initialChildState } = splitPanelsMap(initialPanels);

  let childState = initialChildState; // child state does not need to be observable.
  const layout$ = new BehaviorSubject<DashboardLayout>(initialLayout);
  const children$ = new BehaviorSubject<DashboardChildren>({});

  const setPanels = (panels: DashboardPanelMap) => {
    const { layout, childState: newChildState } = splitPanelsMap(panels);
    childState = newChildState;
    if (!arePanelLayoutsEqual(layout$.value, layout)) layout$.next(layout);
  };

  // --------------------------------------------------------------------------------------
  // Place the incoming embeddable if there is one
  // --------------------------------------------------------------------------------------
  if (incomingEmbeddable) {
    const { serializedState, size, type } = incomingEmbeddable;
    const newId = incomingEmbeddable.embeddableId ?? v4();
    const existingPanel: DashboardPanelState | undefined = panels$.value[newId];
    const sameType = existingPanel?.type === type;

    const placeIncomingPanel = () => {
      const { newPanelPlacement } = runPanelPlacementStrategy(
        PanelPlacementStrategy.findTopLeftMostOpenSpace,
        {
          width: size?.width ?? DEFAULT_PANEL_WIDTH,
          height: size?.height ?? DEFAULT_PANEL_HEIGHT,
          currentPanels: panels$.value,
        }
      );
      return { ...newPanelPlacement, i: newId };
    };
    if (serializedState?.references && serializedState.references.length > 0) {
      pushReferences(prefixReferencesFromPanel(newId, serializedState.references ?? []));
    }

    const gridData = existingPanel ? existingPanel.gridData : placeIncomingPanel();
    const explicitInput = {
      ...(sameType ? existingPanel?.explicitInput : {}),
      ...serializedState.rawState,
    };

    const incomingPanelState: DashboardPanelState = {
      type,
      explicitInput,
      gridData,
    };

    setPanels({
      ...panels$.value,
      [newId]: incomingPanelState,
    });
    trackPanel.setScrollToPanelId(newId);
    trackPanel.setHighlightPanelId(newId);
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
      panels: arePanelLayoutsEqual,
    } as StateComparators<Pick<DashboardState, 'panels'>>,
    internalApi: {
      updateStateForPanels: (partialPanels: { [key: string]: SerializedPanelState<object> }) => {
        const panels = { ...panels$.value };
        Object.keys(partialPanels).forEach((uuid) => {
          const childApi = children$.value[uuid];
          if (childApi && apiHasSerializableState(childApi)) {
            childApi.updateState(partialPanels[key]);
          }
          panels[key] = {
            ...panels[key],
            explicitInput: {
              ...panels[key].explicitInput,
              ...partialPanels[key].rawState,
            },
          };
        });
        setPanels(panels);
      },
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
