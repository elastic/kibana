/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METRIC_TYPE } from '@kbn/analytics';
import type { Reference } from '@kbn/content-management-utils';
import {
  DefaultEmbeddableApi,
  EmbeddablePackageState,
  PanelNotFoundError,
} from '@kbn/embeddable-plugin/public';
import {
  CanDuplicatePanels,
  HasSerializedChildState,
  PanelPackage,
  PresentationContainer,
} from '@kbn/presentation-containers';
import {
  SerializedPanelState,
  SerializedTitles,
  apiHasLibraryTransforms,
  apiHasSerializableState,
  apiPublishesTitle,
  apiPublishesUnsavedChanges,
  getTitle,
} from '@kbn/presentation-publishing';
import { filter, map as lodashMap, max } from 'lodash';
import { BehaviorSubject, Observable, merge, map, combineLatestWith, debounceTime } from 'rxjs';
import { v4 } from 'uuid';
import { asyncForEach } from '@kbn/std';
import { DashboardPanelMap, prefixReferencesFromPanel } from '../../common';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../../common/content_management';
import { dashboardClonePanelActionStrings } from '../dashboard_actions/_dashboard_actions_strings';
import { getPanelAddedSuccessString } from '../dashboard_app/_dashboard_app_strings';
import { getDashboardPanelPlacementSetting } from '../panel_placement/panel_placement_registry';
import { placeClonePanel } from '../panel_placement/place_clone_panel_strategy';
import { runPanelPlacementStrategy } from '../panel_placement/place_new_panel_strategies';
import { PanelPlacementStrategy } from '../plugin_constants';
import { coreServices, usageCollectionService } from '../services/kibana_services';
import { DASHBOARD_UI_METRIC_ID } from '../utils/telemetry_constants';
import { arePanelLayoutsEqual } from './are_panel_layouts_equal';
import type { initializeTrackPanel } from './track_panel';
import {
  DashboardApi,
  DashboardChildState,
  DashboardChildren,
  DashboardLayout,
  DashboardLayoutItem,
  DashboardState,
} from './types';

export function initializePanelsManager(
  incomingEmbeddable: EmbeddablePackageState | undefined,
  initialPanels: DashboardPanelMap, // SERIALIZED STATE ONLY TODO Remove the DashboardPanelMap layer. We could take the Saved Dashboard Panels array here directly.
  trackPanel: ReturnType<typeof initializeTrackPanel>,
  getReferences: (id: string) => Reference[]
): {
  internalApi: {
    startComparing$: (
      lastSavedState$: BehaviorSubject<DashboardState>
    ) => Observable<{ panels?: DashboardPanelMap }>;
    getSerializedStateForPanel: HasSerializedChildState['getSerializedStateForChild'];
    layout$: BehaviorSubject<DashboardLayout>;
    registerChildApi: (api: DefaultEmbeddableApi) => void;
    resetPanels: (lastSavedPanels: DashboardPanelMap) => void;
    setChildState: (uuid: string, state: SerializedPanelState<object>) => void;
    serializePanels: () => { panels: DashboardPanelMap; references: Reference[] };
  };
  api: PresentationContainer<DefaultEmbeddableApi> &
    CanDuplicatePanels & { getDashboardPanelFromId: DashboardApi['getDashboardPanelFromId'] };
} {
  // --------------------------------------------------------------------------------------
  // Set up panel state manager
  // --------------------------------------------------------------------------------------
  const children$ = new BehaviorSubject<DashboardChildren>({});
  const { layout: initialLayout, childState: initialChildState } = deserializePanels(initialPanels);
  const layout$ = new BehaviorSubject<DashboardLayout>(initialLayout); // layout is the source of truth for which panels are in the dashboard.
  let currentChildState = initialChildState; // childState is the source of truth for the state of each panel.

  function deserializePanels(panelMap: DashboardPanelMap) {
    const layout: DashboardLayout = {};
    const childState: DashboardChildState = {};
    Object.keys(panelMap).forEach((uuid) => {
      const { gridData, explicitInput, type } = panelMap[uuid];
      layout[uuid] = { type, gridData };
      childState[uuid] = {
        rawState: explicitInput,
        references: getReferences(uuid),
      };
    });
    return { layout, childState };
  }

  const serializePanels = (): { references: Reference[]; panels: DashboardPanelMap } => {
    const references: Reference[] = [];
    const panels: DashboardPanelMap = {};
    for (const uuid of Object.keys(layout$.value)) {
      references.push(
        ...prefixReferencesFromPanel(uuid, currentChildState[uuid]?.references ?? [])
      );
      panels[uuid] = {
        ...layout$.value[uuid],
        explicitInput: currentChildState[uuid]?.rawState ?? {},
      };
    }
    return { panels, references };
  };

  const resetPanels = (lastSavedPanels: DashboardPanelMap) => {
    const { layout: lastSavedLayout, childState: lstSavedChildState } =
      deserializePanels(lastSavedPanels);

    layout$.next(lastSavedLayout);
    currentChildState = lstSavedChildState;
    let childrenModified = false;
    const currentChildren = { ...children$.value };
    for (const uuid of Object.keys(currentChildren)) {
      if (lastSavedLayout[uuid]) {
        const child = currentChildren[uuid];
        if (apiPublishesUnsavedChanges(child)) child.resetUnsavedChanges();
      } else {
        // if reset resulted in panel removal, we need to update the list of children
        delete currentChildren[uuid];
        delete currentChildState[uuid];
        childrenModified = true;
      }
    }
    if (childrenModified) children$.next(currentChildren);
  };

  // --------------------------------------------------------------------------------------
  // Panel placement functions
  // --------------------------------------------------------------------------------------
  const placeIncomingPanel = (uuid: string, size: EmbeddablePackageState['size']) => {
    const { newPanelPlacement } = runPanelPlacementStrategy(
      PanelPlacementStrategy.findTopLeftMostOpenSpace,
      {
        width: size?.width ?? DEFAULT_PANEL_WIDTH,
        height: size?.height ?? DEFAULT_PANEL_HEIGHT,
        currentPanels: layout$.value,
      }
    );
    return { ...newPanelPlacement, i: uuid };
  };

  const placeNewPanel = async (
    uuid: string,
    panelPackage: PanelPackage,
    gridData?: DashboardLayoutItem['gridData']
  ): Promise<DashboardLayout> => {
    const { panelType: type, serializedState } = panelPackage;
    if (gridData) {
      return { ...layout$.value, [uuid]: { gridData: { ...gridData, i: uuid }, type } };
    }
    const getCustomPlacementSettingFunc = getDashboardPanelPlacementSetting(type);
    const customPlacementSettings = getCustomPlacementSettingFunc
      ? await getCustomPlacementSettingFunc(serializedState)
      : undefined;
    const { newPanelPlacement, otherPanels } = runPanelPlacementStrategy(
      customPlacementSettings?.strategy ?? PanelPlacementStrategy.findTopLeftMostOpenSpace,
      {
        currentPanels: layout$.value,
        height: customPlacementSettings?.height ?? DEFAULT_PANEL_HEIGHT,
        width: customPlacementSettings?.width ?? DEFAULT_PANEL_WIDTH,
      }
    );
    return { ...otherPanels, [uuid]: { gridData: { ...newPanelPlacement, i: uuid }, type } };
  };

  // --------------------------------------------------------------------------------------
  // Place the incoming embeddable if there is one
  // --------------------------------------------------------------------------------------
  if (incomingEmbeddable) {
    const { serializedState, size, type } = incomingEmbeddable;
    const uuid = incomingEmbeddable.embeddableId ?? v4();
    const existingPanel: DashboardLayoutItem | undefined = layout$.value[uuid];
    const sameType = existingPanel?.type === type;

    const gridData = existingPanel ? existingPanel.gridData : placeIncomingPanel(uuid, size);
    currentChildState[uuid] = {
      rawState: {
        ...(sameType && currentChildState[uuid] ? currentChildState[uuid].rawState : {}),
        ...serializedState.rawState,
      },
      references: serializedState?.references,
    };

    layout$.next({
      ...layout$.value,
      [uuid]: { gridData, type },
    });
    trackPanel.setScrollToPanelId(uuid);
    trackPanel.setHighlightPanelId(uuid);
  }

  function getDashboardPanelFromId(panelId: string) {
    const childLayout = layout$.value[panelId];
    const childApi = children$.value[panelId];
    if (!childApi || !childLayout) throw new PanelNotFoundError();
    return {
      type: childLayout.type,
      gridData: childLayout.gridData,
      serializedState: apiHasSerializableState(childApi)
        ? childApi.serializeState()
        : { rawState: {} },
    };
  }

  async function getPanelTitles(): Promise<string[]> {
    const titles: string[] = [];
    await asyncForEach(Object.keys(layout$.value), async (id) => {
      const childApi = await getChildApi(id);
      const title = apiPublishesTitle(childApi) ? getTitle(childApi) : '';
      if (title) titles.push(title);
    });
    return titles;
  }

  // --------------------------------------------------------------------------------------
  // API definition
  // --------------------------------------------------------------------------------------
  const addNewPanel = async <ApiType>(
    panelPackage: PanelPackage,
    displaySuccessMessage?: boolean,
    gridData?: DashboardLayoutItem['gridData']
  ) => {
    const uuid = v4();
    const { panelType: type, serializedState } = panelPackage;
    usageCollectionService?.reportUiCounter(DASHBOARD_UI_METRIC_ID, METRIC_TYPE.CLICK, type);

    if (serializedState) currentChildState[uuid] = serializedState;

    layout$.next(await placeNewPanel(uuid, panelPackage, gridData));

    if (displaySuccessMessage) {
      const title = (serializedState?.rawState as SerializedTitles)?.title;
      coreServices.notifications.toasts.addSuccess({
        title: getPanelAddedSuccessString(title),
        'data-test-subj': 'addEmbeddableToDashboardSuccess',
      });
      trackPanel.setScrollToPanelId(uuid);
      trackPanel.setHighlightPanelId(uuid);
    }
    return (await getChildApi(uuid)) as ApiType;
  };

  const removePanel = (uuid: string) => {
    const layout = { ...layout$.value };
    if (layout[uuid]) {
      delete layout[uuid];
      layout$.next(layout);
    }
    const children = { ...children$.value };
    if (children[uuid]) {
      delete children[uuid];
      children$.next(children);
    }
    if (currentChildState[uuid]) {
      delete currentChildState[uuid];
    }
  };

  const replacePanel = async (idToRemove: string, panelPackage: PanelPackage) => {
    const existingGridData = layout$.value[idToRemove]?.gridData;
    if (!existingGridData) throw new PanelNotFoundError();

    removePanel(idToRemove);
    const newPanel = await addNewPanel<DefaultEmbeddableApi>(panelPackage, false, existingGridData);
    return newPanel.uuid;
  };

  const duplicatePanel = async (uuidToDuplicate: string) => {
    const layoutItemToDuplicate = layout$.value[uuidToDuplicate];
    const apiToDuplicate = children$.value[uuidToDuplicate];
    if (!apiToDuplicate || !layoutItemToDuplicate) throw new PanelNotFoundError();

    const allTitles = await getPanelTitles();
    const lastTitle = apiPublishesTitle(apiToDuplicate) ? getTitle(apiToDuplicate) ?? '' : '';
    const newTitle = getClonedPanelTitle(allTitles, lastTitle);

    const uuidOfDuplicate = v4();
    const serializedState = apiHasLibraryTransforms(apiToDuplicate)
      ? apiToDuplicate.getSerializedStateByValue()
      : apiToDuplicate.serializeState();
    (serializedState.rawState as SerializedTitles).title = newTitle;

    currentChildState[uuidOfDuplicate] = serializedState;

    const { newPanelPlacement, otherPanels } = placeClonePanel({
      width: layoutItemToDuplicate.gridData.w,
      height: layoutItemToDuplicate.gridData.h,
      currentPanels: layout$.value,
      placeBesideId: uuidToDuplicate,
    });
    layout$.next({
      ...otherPanels,
      [uuidOfDuplicate]: {
        gridData: { ...newPanelPlacement, i: uuidOfDuplicate },
        type: layoutItemToDuplicate.type,
      },
    });

    coreServices.notifications.toasts.addSuccess({
      title: dashboardClonePanelActionStrings.getSuccessMessage(),
      'data-test-subj': 'addObjectToContainerSuccess',
    });
  };

  const getChildApi = async (uuid: string): Promise<DefaultEmbeddableApi | undefined> => {
    if (!layout$.value[uuid]) throw new PanelNotFoundError();
    if (children$.value[uuid]) return children$.value[uuid];

    return new Promise((resolve) => {
      const subscription = merge(children$, layout$).subscribe(() => {
        if (children$.value[uuid]) {
          subscription.unsubscribe();
          resolve(children$.value[uuid]);
        }

        // If we hit this, the panel was removed before the embeddable finished loading.
        if (layout$.value[uuid] === undefined) {
          subscription.unsubscribe();
          resolve(undefined);
        }
      });
    });
  };

  return {
    internalApi: {
      getSerializedStateForPanel: (uuid: string) => currentChildState[uuid],
      layout$,
      resetPanels,
      serializePanels,
      startComparing$: (
        lastSavedState$: BehaviorSubject<DashboardState>
      ): Observable<{ panels?: DashboardPanelMap }> => {
        return layout$.pipe(
          debounceTime(100),
          combineLatestWith(lastSavedState$.pipe(map((lastSaved) => lastSaved.panels))),
          map(([, lastSavedPanels]) => {
            const panels = serializePanels().panels;
            if (!arePanelLayoutsEqual(lastSavedPanels, panels)) {
              return { panels };
            }
            return {};
          })
        );
      },
      registerChildApi: (api: DefaultEmbeddableApi) => {
        children$.next({
          ...children$.value,
          [api.uuid]: api,
        });
      },
      setChildState: (uuid: string, state: SerializedPanelState<object>) => {
        currentChildState[uuid] = state;
      },
    },
    api: {
      children$,
      getChildApi,
      addNewPanel,
      removePanel,
      replacePanel,
      duplicatePanel,
      getDashboardPanelFromId,
      getPanelCount: () => Object.keys(layout$.value).length,
      canRemovePanels: () => trackPanel.expandedPanelId$.value === undefined,
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

  const cloneNumbers = lodashMap(similarTitles, (title: string) => {
    if (title.match(cloneRegex)) return 0;
    const cloneTag = title.match(cloneNumberRegex);
    return cloneTag ? parseInt(cloneTag[0].replace(/[^0-9.]/g, ''), 10) : -1;
  });
  const similarBaseTitlesCount = max(cloneNumbers) || 0;

  return similarBaseTitlesCount < 0
    ? baseTitle + ` (${clonedTag})`
    : baseTitle + ` (${clonedTag} ${similarBaseTitlesCount + 1})`;
}
