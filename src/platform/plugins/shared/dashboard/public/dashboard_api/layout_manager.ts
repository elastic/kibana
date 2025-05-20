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
import { PanelPackage } from '@kbn/presentation-containers';
import {
  SerializedPanelState,
  SerializedTitles,
  apiHasLibraryTransforms,
  apiHasSerializableState,
  apiPublishesTitle,
  apiPublishesUnsavedChanges,
  getTitle,
} from '@kbn/presentation-publishing';
import { asyncForEach } from '@kbn/std';
import { filter, map as lodashMap, max } from 'lodash';
import { BehaviorSubject, Observable, combineLatestWith, debounceTime, map, merge } from 'rxjs';
import { v4 } from 'uuid';
import type { DashboardSectionMap, DashboardState } from '../../common';
import { DashboardPanelMap } from '../../common';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../../common/content_management';
import { prefixReferencesFromPanel } from '../../common/dashboard_container/persistable_state/dashboard_container_references';
import { dashboardClonePanelActionStrings } from '../dashboard_actions/_dashboard_actions_strings';
import { getPanelAddedSuccessString } from '../dashboard_app/_dashboard_app_strings';
import { getDashboardPanelPlacementSetting } from '../panel_placement/panel_placement_registry';
import { placeClonePanel } from '../panel_placement/place_clone_panel_strategy';
import { runPanelPlacementStrategy } from '../panel_placement/place_new_panel_strategies';
import { PanelPlacementStrategy } from '../plugin_constants';
import { coreServices, usageCollectionService } from '../services/kibana_services';
import { DASHBOARD_UI_METRIC_ID } from '../utils/telemetry_constants';
import { areLayoutsEqual } from './are_layouts_equal';
import type { initializeTrackPanel } from './track_panel';
import {
  DashboardChildState,
  DashboardChildren,
  DashboardLayout,
  DashboardLayoutItem,
  DashboardPanel,
  ReservedLayoutItemTypeError,
  ReservedLayoutItemTypes,
  isDashboardSection,
} from './types';

export function initializeLayoutManager(
  incomingEmbeddable: EmbeddablePackageState | undefined,
  initialPanels: DashboardPanelMap, // SERIALIZED STATE ONLY TODO Remove the DashboardPanelMap layer. We could take the Saved Dashboard Panels array here directly.
  initialSections: DashboardSectionMap,
  trackPanel: ReturnType<typeof initializeTrackPanel>,
  getReferences: (id: string) => Reference[]
) {
  // --------------------------------------------------------------------------------------
  // Set up panel state manager
  // --------------------------------------------------------------------------------------
  const children$ = new BehaviorSubject<DashboardChildren>({});
  const { layout: initialLayout, childState: initialChildState } = deserializePanels(
    initialPanels,
    initialSections
  );
  const layout$ = new BehaviorSubject<DashboardLayout>(initialLayout); // layout is the source of truth for which panels are in the dashboard.
  let currentChildState = initialChildState; // childState is the source of truth for the state of each panel.

  function deserializePanels(panelMap: DashboardPanelMap, sectionMap: DashboardSectionMap) {
    const layout: DashboardLayout = {};
    const childState: DashboardChildState = {};
    Object.keys(sectionMap).forEach((uuid) => {
      layout[uuid] = { collapsed: false, ...sectionMap[uuid], type: 'section' };
    });
    Object.keys(panelMap).forEach((uuid) => {
      const { gridData, explicitInput, type } = panelMap[uuid];
      layout[uuid] = { type, gridData } as DashboardPanel;
      childState[uuid] = {
        rawState: explicitInput,
        references: getReferences(uuid),
      };
    });
    Object.keys(sectionMap).forEach((uuid) => {});
    return { layout, childState };
  }

  const serializeLayout = (): {
    references: Reference[];
    panels: DashboardPanelMap;
    sections: DashboardSectionMap;
  } => {
    const references: Reference[] = [];
    const panels: DashboardPanelMap = {};
    const sections: DashboardSectionMap = {};
    const layout = layout$.value;
    for (const uuid of Object.keys(layout)) {
      const widget = layout[uuid];
      if (isDashboardSection(widget)) {
        sections[uuid] = { ...widget, id: uuid };
      } else {
        references.push(
          ...prefixReferencesFromPanel(uuid, currentChildState[uuid]?.references ?? [])
        );
        panels[uuid] = {
          ...widget,
          explicitInput: currentChildState[uuid]?.rawState ?? {},
        };
      }
    }
    return { panels, sections, references };
  };

  const resetLayout = (
    lastSavedPanels: DashboardPanelMap,
    lastSavedSections: DashboardSectionMap
  ) => {
    const { layout: lastSavedLayout, childState: lastSavedChildState } = deserializePanels(
      lastSavedPanels,
      lastSavedSections
    );

    layout$.next(lastSavedLayout);
    currentChildState = lastSavedChildState;
    let childrenModified = false;
    const currentChildren = { ...children$.value };
    for (const uuid of Object.keys(currentChildren)) {
      if (isDashboardSection(lastSavedLayout[uuid])) {
        // sections do not have children APIs that need updating
        continue;
      }
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
      return {
        ...layout$.value,
        [uuid]: { gridData: { ...gridData, i: uuid }, type } as DashboardPanel,
      };
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
    return {
      ...otherPanels,
      [uuid]: { gridData: { ...newPanelPlacement, i: uuid }, type } as DashboardPanel,
    };
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
      panels: {
        ...layout$.value.panels,
        [uuid]: { gridData, type },
      },
      // sections: {},
    });
    trackPanel.setScrollToPanelId(uuid);
    trackPanel.setHighlightPanelId(uuid);
  }

  function getDashboardPanelFromId(panelId: string) {
    const childLayout = layout$.value[panelId];
    const childApi = children$.value[panelId];
    if (!childApi || !childLayout || isDashboardSection(childLayout))
      throw new PanelNotFoundError();
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
      // const title = apiPublishesTitle(childApi)
      // ? getTitle(childApi)
      // : (panels$.value[id]?.explicitInput as { title?: string }).title;
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
    if (ReservedLayoutItemTypes.includes(type)) {
      throw new ReservedLayoutItemTypeError();
    }

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
    if (!existingGridData || isDashboardSection(layout$.value[idToRemove]))
      throw new PanelNotFoundError();

    removePanel(idToRemove);
    const newPanel = await addNewPanel<DefaultEmbeddableApi>(panelPackage, false, existingGridData);
    return newPanel.uuid;
  };

  const duplicatePanel = async (uuidToDuplicate: string) => {
    const layoutItemToDuplicate = layout$.value[uuidToDuplicate];
    const apiToDuplicate = children$.value[uuidToDuplicate];
    if (!apiToDuplicate || !layoutItemToDuplicate || isDashboardSection(layoutItemToDuplicate))
      throw new PanelNotFoundError();

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
      sectionId: layoutItemToDuplicate.gridData.sectionId,
      currentPanels: layout$.value,
      placeBesideId: uuidToDuplicate,
    });
    layout$.next({
      ...otherPanels,
      [uuidOfDuplicate]: {
        gridData: {
          ...newPanelPlacement,
          i: uuidOfDuplicate,
          sectionId: layoutItemToDuplicate.gridData.sectionId,
        },
        type: layoutItemToDuplicate.type,
      },
    });

    coreServices.notifications.toasts.addSuccess({
      title: dashboardClonePanelActionStrings.getSuccessMessage(),
      'data-test-subj': 'addObjectToContainerSuccess',
    });
  };

  const getChildApi = async (uuid: string): Promise<DefaultEmbeddableApi | undefined> => {
    if (!layout$.value[uuid] || isDashboardSection(layout$.value[uuid]))
      throw new PanelNotFoundError();
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
      resetPanels: resetLayout,
      serializePanels: serializeLayout,
      startComparing$: (
        lastSavedState$: BehaviorSubject<DashboardState>
      ): Observable<{ panels?: DashboardPanelMap; sections?: DashboardSectionMap }> => {
        return layout$.pipe(
          debounceTime(100),
          combineLatestWith(
            lastSavedState$.pipe(
              map((lastSaved) => ({ panels: lastSaved.panels, sections: lastSaved.sections }))
            )
          ),
          map(([, { panels: lastSavedPanels, sections: lastSavedSections }]) => {
            const { panels, sections } = serializeLayout();
            if (
              !areLayoutsEqual(
                { panels: lastSavedPanels, sections: lastSavedSections },
                { panels, sections }
              )
            ) {
              return { panels, sections };
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
      isSectionCollapsed: (id?: string) => {
        if (!id) return false; // this is the first section and it cannot be collapsed
        // return Boolean(sections$.getValue()?.[id]?.collapsed);
      },
    },
    api: {
      /** Panels */
      children$,
      getChildApi,
      addNewPanel,
      removePanel,
      replacePanel,
      duplicatePanel,
      getDashboardPanelFromId,
      getPanelCount: () => Object.keys(layout$.value.panels).length,
      canRemovePanels: () => trackPanel.expandedPanelId$.value === undefined,

      /** Sectionss */
      // addNewSection: () => {
      //   const oldSections = sections$.getValue() ?? {};
      //   const newId = uuidv4();
      //   setSections({
      //     ...oldSections,
      //     [newId]: {
      //       id: newId,
      //       order: Object.keys(oldSections).length + 1,
      //       title: i18n.translate('dashboard.defaultSectionTitle', {
      //         defaultMessage: 'New collapsible section',
      //       }),
      //       collapsed: false,
      //     },
      //   });

      //   // scroll to bottom after row is added
      //   scrollToBottom$.next();
      // },
      // setSections,
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
