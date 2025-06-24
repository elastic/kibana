/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filter, map as lodashMap, max } from 'lodash';
import {
  BehaviorSubject,
  Observable,
  combineLatestWith,
  debounceTime,
  map,
  merge,
  tap,
} from 'rxjs';
import { v4 } from 'uuid';

import { METRIC_TYPE } from '@kbn/analytics';
import type { Reference } from '@kbn/content-management-utils';
import {
  DefaultEmbeddableApi,
  EmbeddablePackageState,
  PanelNotFoundError,
} from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { PanelPackage } from '@kbn/presentation-containers';
import {
  SerializedPanelState,
  SerializedTitles,
  apiHasLibraryTransforms,
  apiHasSerializableState,
  apiPublishesTitle,
  apiPublishesUnsavedChanges,
  getTitle,
  logStateDiff,
} from '@kbn/presentation-publishing';
import { asyncForEach } from '@kbn/std';

import type { DashboardPanel } from '../../../server';
import type { DashboardState } from '../../../common';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../../../common/content_management';
import { dashboardClonePanelActionStrings } from '../../dashboard_actions/_dashboard_actions_strings';
import { getPanelAddedSuccessString } from '../../dashboard_app/_dashboard_app_strings';
import { getPanelPlacementSetting } from '../../panel_placement/get_panel_placement_settings';
import { placeClonePanel } from '../../panel_placement/place_clone_panel_strategy';
import { runPanelPlacementStrategy } from '../../panel_placement/place_new_panel_strategies';
import { PanelPlacementStrategy } from '../../plugin_constants';
import { coreServices, usageCollectionService } from '../../services/kibana_services';
import { DASHBOARD_UI_METRIC_ID } from '../../utils/telemetry_constants';
import { areLayoutsEqual } from './are_layouts_equal';
import type { initializeTrackPanel } from '../track_panel';
import { deserializeLayout } from './deserialize_layout';
import { serializeLayout } from './serialize_layout';
import type { DashboardChildren, DashboardLayout, DashboardLayoutPanel } from './types';

export function initializeLayoutManager(
  incomingEmbeddable: EmbeddablePackageState | undefined,
  initialPanels: DashboardState['panels'],
  trackPanel: ReturnType<typeof initializeTrackPanel>,
  getReferences: (id: string) => Reference[]
) {
  // --------------------------------------------------------------------------------------
  // Set up panel state manager
  // --------------------------------------------------------------------------------------
  const children$ = new BehaviorSubject<DashboardChildren>({});
  const { layout: initialLayout, childState: initialChildState } = deserializeLayout(
    initialPanels,
    getReferences
  );
  const layout$ = new BehaviorSubject<DashboardLayout>(initialLayout); // layout is the source of truth for which panels are in the dashboard.
  let currentChildState = initialChildState; // childState is the source of truth for the state of each panel.

  let lastSavedLayout = initialLayout;
  let lastSavedChildState = initialChildState;
  const resetLayout = () => {
    layout$.next({ ...lastSavedLayout });
    currentChildState = { ...lastSavedChildState };
    let childrenModified = false;
    const currentChildren = { ...children$.value };
    for (const uuid of Object.keys(currentChildren)) {
      if (lastSavedLayout.panels[uuid]) {
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
        currentPanels: layout$.value.panels,
      }
    );
    return { ...newPanelPlacement, i: uuid };
  };

  const placeNewPanel = async (
    uuid: string,
    panelPackage: PanelPackage,
    gridData?: DashboardPanel['gridData']
  ): Promise<DashboardLayout> => {
    const { panelType: type, serializedState } = panelPackage;
    if (gridData) {
      return {
        ...layout$.value,
        panels: {
          ...layout$.value.panels,
          [uuid]: { gridData: { ...gridData, i: uuid }, type },
        },
      };
    }
    const customPlacementSettings = await getPanelPlacementSetting(type, serializedState);
    const { newPanelPlacement, otherPanels } = runPanelPlacementStrategy(
      customPlacementSettings?.strategy ?? PanelPlacementStrategy.findTopLeftMostOpenSpace,
      {
        currentPanels: layout$.value.panels,
        height: customPlacementSettings?.height ?? DEFAULT_PANEL_HEIGHT,
        width: customPlacementSettings?.width ?? DEFAULT_PANEL_WIDTH,
      }
    );
    return {
      ...layout$.value,
      panels: {
        ...otherPanels,
        [uuid]: { gridData: { ...newPanelPlacement, i: uuid }, type },
      },
    };
  };

  // --------------------------------------------------------------------------------------
  // Place the incoming embeddable if there is one
  // --------------------------------------------------------------------------------------
  if (incomingEmbeddable) {
    const { serializedState, size, type } = incomingEmbeddable;
    const uuid = incomingEmbeddable.embeddableId ?? v4();
    const existingPanel: DashboardLayoutPanel | undefined = layout$.value.panels[uuid];
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
    });
    trackPanel.setScrollToPanelId(uuid);
    trackPanel.setHighlightPanelId(uuid);
  }

  function getDashboardPanelFromId(panelId: string) {
    const childLayout = layout$.value.panels[panelId];
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
    await asyncForEach(Object.keys(layout$.value.panels), async (id) => {
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
    gridData?: DashboardPanel['gridData']
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
    }
    trackPanel.setScrollToPanelId(uuid);
    trackPanel.setHighlightPanelId(uuid);
    return (await getChildApi(uuid)) as ApiType;
  };

  const removePanel = (uuid: string) => {
    const panels = { ...layout$.value.panels };
    if (panels[uuid]) {
      delete panels[uuid];
      layout$.next({ ...layout$.value, panels });
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
    const existingGridData = layout$.value.panels[idToRemove]?.gridData;
    if (!existingGridData) throw new PanelNotFoundError();

    removePanel(idToRemove);
    const newPanel = await addNewPanel<DefaultEmbeddableApi>(panelPackage, false, existingGridData);
    return newPanel.uuid;
  };

  const duplicatePanel = async (uuidToDuplicate: string) => {
    const layoutItemToDuplicate = layout$.value.panels[uuidToDuplicate];
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
      sectionId: layoutItemToDuplicate.gridData.sectionId,
      currentPanels: layout$.value.panels,
      placeBesideId: uuidToDuplicate,
    });
    layout$.next({
      ...layout$.value,
      panels: {
        ...otherPanels,
        [uuidOfDuplicate]: {
          gridData: {
            ...newPanelPlacement,
            i: uuidOfDuplicate,
            sectionId: layoutItemToDuplicate.gridData.sectionId,
          },
          type: layoutItemToDuplicate.type,
        },
      },
    });

    coreServices.notifications.toasts.addSuccess({
      title: dashboardClonePanelActionStrings.getSuccessMessage(),
      'data-test-subj': 'addObjectToContainerSuccess',
    });
  };

  const getChildApi = async (uuid: string): Promise<DefaultEmbeddableApi | undefined> => {
    if (!layout$.value.panels[uuid]) throw new PanelNotFoundError();
    if (children$.value[uuid]) return children$.value[uuid];

    return new Promise((resolve) => {
      const subscription = merge(children$, layout$).subscribe(() => {
        if (children$.value[uuid]) {
          subscription.unsubscribe();
          resolve(children$.value[uuid]);
        }

        // If we hit this, the panel was removed before the embeddable finished loading.
        if (layout$.value.panels[uuid] === undefined) {
          subscription.unsubscribe();
          resolve(undefined);
        }
      });
    });
  };

  return {
    internalApi: {
      getSerializedStateForPanel: (panelId: string) => currentChildState[panelId],
      getLastSavedStateForPanel: (panelId: string) => lastSavedChildState[panelId],
      layout$,
      reset: resetLayout,
      serializeLayout: () => serializeLayout(layout$.value, currentChildState),
      startComparing$: (
        lastSavedState$: BehaviorSubject<DashboardState>
      ): Observable<{ panels?: DashboardState['panels'] }> => {
        return layout$.pipe(
          debounceTime(100),
          combineLatestWith(
            lastSavedState$.pipe(
              map((lastSaved) => deserializeLayout(lastSaved.panels, getReferences)),
              tap(({ layout, childState }) => {
                lastSavedChildState = childState;
                lastSavedLayout = layout;
              })
            )
          ),
          map(([currentLayout]) => {
            if (!areLayoutsEqual(lastSavedLayout, currentLayout)) {
              logStateDiff('dashboard layout', lastSavedLayout, currentLayout);
              return { panels: serializeLayout(currentLayout, currentChildState).panels };
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
      isSectionCollapsed: (sectionId?: string): boolean => {
        const { sections } = layout$.getValue();
        return Boolean(sectionId && sections[sectionId].collapsed);
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

      /** Sections */
      addNewSection: () => {
        const currentLayout = layout$.getValue();

        // find the max y so we know where to add the section
        let maxY = 0;
        [...Object.values(currentLayout.panels), ...Object.values(currentLayout.sections)].forEach(
          (widget) => {
            const { y, h } = { h: 1, ...widget.gridData };
            maxY = Math.max(maxY, y + h);
          }
        );

        // add the new section
        const sections = { ...currentLayout.sections };
        const newId = v4();
        sections[newId] = {
          gridData: { i: newId, y: maxY },
          title: i18n.translate('dashboard.defaultSectionTitle', {
            defaultMessage: 'New collapsible section',
          }),
          collapsed: false,
        };
        layout$.next({
          ...currentLayout,
          sections,
        });
        trackPanel.scrollToBottom$.next();
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
