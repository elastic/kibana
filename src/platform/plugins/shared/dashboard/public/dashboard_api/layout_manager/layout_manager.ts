/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { filter, map as lodashMap, max } from 'lodash';
import {
  BehaviorSubject,
  combineLatest,
  combineLatestWith,
  debounceTime,
  distinctUntilChanged,
  map,
  merge,
  mergeMap,
  startWith,
  tap,
  type Observable,
} from 'rxjs';
import { v4 } from 'uuid';

import { METRIC_TYPE } from '@kbn/analytics';
import type { Reference } from '@kbn/content-management-utils';
import type { DefaultEmbeddableApi, EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { PanelNotFoundError } from '@kbn/embeddable-plugin/public';
import type { GridLayoutData, GridPanelData, GridSectionData } from '@kbn/grid-layout';
import { i18n } from '@kbn/i18n';
import type { PanelPackage } from '@kbn/presentation-containers';
import type { SerializedPanelState, SerializedTitles } from '@kbn/presentation-publishing';
import {
  apiHasLibraryTransforms,
  apiHasSerializableState,
  apiPublishesTitle,
  apiPublishesUnsavedChanges,
  getTitle,
  logStateDiff,
} from '@kbn/presentation-publishing';
import { asyncForEach } from '@kbn/std';

import type { DashboardState } from '../../../common';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../../../common/content_management';
import type { DashboardPanel } from '../../../server';
import { dashboardClonePanelActionStrings } from '../../dashboard_actions/_dashboard_actions_strings';
import { getPanelAddedSuccessString } from '../../dashboard_app/_dashboard_app_strings';
import { getPanelSettings } from '../../panel_placement/get_panel_placement_settings';
import { placeClonePanel } from '../../panel_placement/place_clone_panel_strategy';
import { runPanelPlacementStrategy } from '../../panel_placement/place_new_panel_strategies';
import type { PanelResizeSettings } from '../../panel_placement/types';
import { PanelPlacementStrategy } from '../../plugin_constants';
import { coreServices, usageCollectionService } from '../../services/kibana_services';
import { DASHBOARD_UI_METRIC_ID } from '../../utils/telemetry_constants';
import type { initializeTrackPanel } from '../track_panel';
import { areLayoutsEqual } from './are_layouts_equal';
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
  const gridLayout$ = new BehaviorSubject(transformDashboardLayoutToGridLayout(initialLayout, {})); // source of truth for rendering
  const panelResizeSettings$: Observable<{ [panelType: string]: PanelResizeSettings }> =
    layout$.pipe(
      map(({ panels }) => {
        return [...new Set(Object.values(panels).map((panel) => panel.type))];
      }),
      distinctUntilChanged(deepEqual),
      mergeMap(async (panelTypes: string[]) => {
        const settingsByPanelType: { [panelType: string]: PanelResizeSettings } = {};
        await asyncForEach(panelTypes, async (type) => {
          const panelSettings = await getPanelSettings(type);
          if (panelSettings?.resizeSettings)
            settingsByPanelType[type] = panelSettings.resizeSettings;
        });
        return settingsByPanelType;
      }),
      startWith({}) // do not block rendering by waiting for these settings
    );

  /** Keep gridLayout$ in sync with layout$ + panelResizeSettings$ */
  const gridLayoutSubscription = combineLatest([layout$, panelResizeSettings$]).subscribe(
    ([layout, panelResizeSettings]) => {
      gridLayout$.next(transformDashboardLayoutToGridLayout(layout, panelResizeSettings));
    }
  );

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
    grid?: DashboardPanel['grid']
  ): Promise<DashboardLayout> => {
    const { panelType: type, serializedState } = panelPackage;
    if (grid) {
      return {
        ...layout$.value,
        panels: {
          ...layout$.value.panels,
          [uuid]: { grid: { ...grid, i: uuid }, type },
        },
      };
    }
    const panelSettings = await getPanelSettings(type, serializedState);
    const panelPlacementSettings = {
      strategy: PanelPlacementStrategy.findTopLeftMostOpenSpace,
      height: DEFAULT_PANEL_HEIGHT,
      width: DEFAULT_PANEL_WIDTH,
      ...panelSettings?.placementSettings,
    };
    const { newPanelPlacement, otherPanels } = runPanelPlacementStrategy(
      panelPlacementSettings?.strategy,
      {
        currentPanels: layout$.value.panels,
        height: panelPlacementSettings.height,
        width: panelPlacementSettings.width,
      }
    );
    return {
      ...layout$.value,
      panels: {
        ...otherPanels,
        [uuid]: { grid: { ...newPanelPlacement, i: uuid }, type },
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

    const grid = existingPanel ? existingPanel.grid : placeIncomingPanel(uuid, size);
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
        [uuid]: { grid, type },
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
      grid: childLayout.grid,
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
    grid?: DashboardPanel['grid']
  ) => {
    const { panelType: type, serializedState, maybePanelId } = panelPackage;
    const uuid = maybePanelId ?? v4();
    usageCollectionService?.reportUiCounter(DASHBOARD_UI_METRIC_ID, METRIC_TYPE.CLICK, type);

    if (serializedState) currentChildState[uuid] = serializedState;

    layout$.next(await placeNewPanel(uuid, panelPackage, grid));

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
    const existingGridData = layout$.value.panels[idToRemove]?.grid;
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
      width: layoutItemToDuplicate.grid.w,
      height: layoutItemToDuplicate.grid.h,
      sectionId: layoutItemToDuplicate.grid.sectionId,
      currentPanels: layout$.value.panels,
      placeBesideId: uuidToDuplicate,
    });
    layout$.next({
      ...layout$.value,
      panels: {
        ...otherPanels,
        [uuidOfDuplicate]: {
          grid: {
            ...newPanelPlacement,
            i: uuidOfDuplicate,
            sectionId: layoutItemToDuplicate.grid.sectionId,
          },
          type: layoutItemToDuplicate.type,
        },
      },
    });

    coreServices.notifications.toasts.addSuccess({
      title: dashboardClonePanelActionStrings.getSuccessMessage(),
      'data-test-subj': 'addObjectToContainerSuccess',
    });
    trackPanel.setScrollToPanelId(uuidOfDuplicate);
    trackPanel.setHighlightPanelId(uuidOfDuplicate);
  };

  const getChildApi = async (uuid: string): Promise<DefaultEmbeddableApi | undefined> => {
    const panelLayout = layout$.value.panels[uuid];
    if (!panelLayout) throw new PanelNotFoundError();
    if (children$.value[uuid]) return children$.value[uuid];

    // if the panel is in a collapsed section and has never been built, then childApi will be undefined
    if (isSectionCollapsed(panelLayout.grid.sectionId)) {
      return undefined;
    }

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

  function isSectionCollapsed(sectionId?: string): boolean {
    const { sections } = layout$.getValue();
    return Boolean(sectionId && sections[sectionId].collapsed);
  }

  return {
    internalApi: {
      getSerializedStateForPanel: (panelId: string) => currentChildState[panelId],
      getLastSavedStateForPanel: (panelId: string) => lastSavedChildState[panelId],
      layout$,
      gridLayout$,
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
      isSectionCollapsed,
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
            const { y, h } = { h: 1, ...widget.grid };
            maxY = Math.max(maxY, y + h);
          }
        );

        // add the new section
        const sections = { ...currentLayout.sections };
        const newId = v4();
        sections[newId] = {
          grid: { i: newId, y: maxY },
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
    cleanup: () => {
      gridLayoutSubscription.unsubscribe();
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

const transformDashboardLayoutToGridLayout = (
  layout: DashboardLayout,
  resizeSettings: { [panelType: string]: PanelResizeSettings }
) => {
  const newLayout: GridLayoutData = {};
  Object.keys(layout.sections).forEach((sectionId) => {
    const section = layout.sections[sectionId];
    newLayout[sectionId] = {
      id: sectionId,
      type: 'section',
      row: section.grid.y,
      isCollapsed: Boolean(section.collapsed),
      title: section.title,
      panels: {},
    };
  });
  Object.keys(layout.panels).forEach((panelId) => {
    const grid = layout.panels[panelId].grid;
    const type = layout.panels[panelId].type;
    const basePanel = {
      id: panelId,
      row: grid.y,
      column: grid.x,
      width: grid.w,
      height: grid.h,
      resizeOptions: resizeSettings[type],
    } as GridPanelData;
    if (grid.sectionId) {
      (newLayout[grid.sectionId] as GridSectionData).panels[panelId] = basePanel;
    } else {
      newLayout[panelId] = {
        ...basePanel,
        type: 'panel',
      };
    }
  });
  return newLayout;
};
