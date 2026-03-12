/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { filter, map as lodashMap, max, pick } from 'lodash';
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
import type { DefaultEmbeddableApi, EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { PanelNotFoundError } from '@kbn/embeddable-plugin/public';
import type { GridLayoutData, GridPanelData, GridSectionData } from '@kbn/grid-layout';
import type { PinnedControlLayoutState as PinnedPanelLayoutState } from '@kbn/controls-schemas';
import { i18n } from '@kbn/i18n';
import type { SerializedTitles, PanelPackage } from '@kbn/presentation-publishing';
import {
  childrenUnsavedChanges$,
  apiHasLibraryTransforms,
  apiHasSerializableState,
  apiPublishesTitle,
  apiPublishesUnsavedChanges,
  getTitle,
  logStateDiff,
  shouldLogStateDiff,
} from '@kbn/presentation-publishing';
import { asyncForEach } from '@kbn/std';

import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-constants';
import type { PinnedControlLayoutState } from '@kbn/controls-schemas';
import type { PanelResizeSettings } from '@kbn/presentation-util-plugin/public';
import { PanelPlacementStrategy } from '@kbn/presentation-util-plugin/public';
import type { DashboardState } from '../../../common';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../../../common/constants';
import type { DashboardPanel } from '../../../server';
import { dashboardClonePanelActionStrings } from '../../dashboard_actions/_dashboard_actions_strings';
import { getPanelAddedSuccessString } from '../../dashboard_app/_dashboard_app_strings';
import {
  getPanelSettings,
  placeClonePanel,
  runPanelPlacementStrategy,
} from '../../panel_placement';
import { DEFAULT_PANEL_PLACEMENT_SETTINGS } from '../../plugin_constants';
import { coreServices, usageCollectionService } from '../../services/kibana_services';
import { DASHBOARD_UI_METRIC_ID } from '../../utils/telemetry_constants';
import type { initializeTrackPanel } from '../track_panel';
import type { initializeViewModeManager } from '../view_mode_manager';
import { arePanelLayoutsEqual, arePinnedPanelLayoutsEqual } from './are_layouts_equal';
import { deserializeLayout } from './deserialize_layout';
import { serializeLayout } from './serialize_layout';
import {
  isDashboardLayoutPanel,
  type DashboardChildren,
  type DashboardLayout,
  type DashboardLayoutPanel,
  type DashboardPinnablePanel,
} from './types';

export function initializeLayoutManager(
  viewModeManager: ReturnType<typeof initializeViewModeManager>,
  incomingEmbeddables: EmbeddablePackageState[] | undefined,
  initialPanels: DashboardState['panels'],
  initialPinnedPanels: DashboardState['pinned_panels'] | undefined,
  trackPanel: ReturnType<typeof initializeTrackPanel>
) {
  // --------------------------------------------------------------------------------------
  // Set up panel state manager
  // --------------------------------------------------------------------------------------
  const children$ = new BehaviorSubject<DashboardChildren>({});
  const { layout: initialLayout, childState: initialChildState } = deserializeLayout(
    initialPanels,
    initialPinnedPanels
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

  const childrenChanges$ = childrenUnsavedChanges$(children$);
  const childrenChangesSubscription = childrenChanges$.subscribe((childrenChanges) => {
    for (const { uuid, hasUnsavedChanges } of childrenChanges) {
      const childApi = children$.value[uuid];
      if (hasUnsavedChanges && childApi && apiHasSerializableState(childApi)) {
        currentChildState[uuid] = childApi.serializeState();
      }
    }
  });

  /** Observable that publishes `true` when all children APIs are available */
  const childrenLoading$ = combineLatest([children$, layout$, viewModeManager.api.viewMode$]).pipe(
    map(([children, layout, viewMode]) => {
      // filter out panels that are in collapsed sections, since the APIs will never be available
      const expectedChildCount =
        Object.values(layout.panels).filter((panel) => {
          return panel.grid.sectionId ? !isSectionCollapsed(panel.grid.sectionId) : true;
        }).length + (viewMode === 'print' ? 0 : Object.values(layout.pinnedPanels).length); // pinned panels are not rendered in print mode

      const currentChildCount = Object.keys(children).length;
      return expectedChildCount !== currentChildCount;
    }),
    distinctUntilChanged()
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
      if (lastSavedLayout.panels[uuid] || lastSavedLayout.pinnedPanels[uuid]) {
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
  const placeNewPanel = async (
    uuid: string,
    panelPackage: PanelPackage,
    grid?: DashboardPanel['grid'],
    beside?: string
  ): Promise<DashboardLayout> => {
    const { panelType: type, serializedState } = panelPackage;
    if (grid) {
      return {
        ...layout$.value,
        panels: {
          ...layout$.value.panels,
          [uuid]: { grid, type },
        },
      };
    }
    const panelSettings = await getPanelSettings(type, serializedState);
    const panelPlacementSettings = {
      ...DEFAULT_PANEL_PLACEMENT_SETTINGS,
      ...panelSettings?.placementSettings,
    };
    const { newPanelPlacement, otherPanels } = runPanelPlacementStrategy(
      panelPlacementSettings?.strategy,
      {
        currentPanels: layout$.value.panels,
        height: panelPlacementSettings.height,
        width: panelPlacementSettings.width,
        beside,
      }
    );

    return {
      ...layout$.value,
      panels: {
        ...otherPanels,
        [uuid]: { grid: newPanelPlacement, type },
      },
    };
  };

  // --------------------------------------------------------------------------------------
  // Place the incoming embeddables if there is at least one
  // --------------------------------------------------------------------------------------
  if (incomingEmbeddables?.length) {
    const first = incomingEmbeddables[0];
    if (!first.embeddableId) first.embeddableId = v4(); // give first panel an ID so we can place others around it

    for (const incomingEmbeddable of incomingEmbeddables) {
      const { serializedState, size, type } = incomingEmbeddable;
      const uuid = incomingEmbeddable.embeddableId ?? v4();
      const existingPanel: DashboardLayoutPanel | undefined = layout$.value.panels[uuid];
      const sameType = existingPanel?.type === type;

      const grid = existingPanel
        ? existingPanel.grid
        : runPanelPlacementStrategy(PanelPlacementStrategy.findTopLeftMostOpenSpace, {
            width: size?.width ?? DEFAULT_PANEL_WIDTH,
            height: size?.height ?? DEFAULT_PANEL_HEIGHT,
            currentPanels: layout$.value.panels,
            /**
             * We can assume that all panels being sent as a single package are related; so,
             * place them close together by grouping them around the first embeddable.
             */
            beside: uuid === first.embeddableId ? undefined : first.embeddableId,
          }).newPanelPlacement;
      currentChildState[uuid] = {
        ...(sameType && currentChildState[uuid] ? currentChildState[uuid] : {}),
        ...serializedState,
      };

      layout$.next({
        ...layout$.value,
        panels: {
          ...layout$.value.panels,
          [uuid]: { grid, type },
        },
      });
    }
    trackPanel.setScrollToPanelId(first.embeddableId);
    trackPanel.setHighlightPanelId(first.embeddableId);
  }

  // --------------------------------------------------------------------------------------
  // API definition
  // --------------------------------------------------------------------------------------
  function getDashboardPanelFromId(panelId: string) {
    const childLayout = layout$.value.panels[panelId];
    const childApi = children$.value[panelId];

    if (!childApi || !childLayout) throw new PanelNotFoundError();
    return {
      type: childLayout.type,
      grid: childLayout.grid,
      serializedState: apiHasSerializableState(childApi) ? childApi.serializeState() : {},
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

  const createPanel = (panelPackage: PanelPackage) => {
    const { serializedState, maybePanelId } = panelPackage;
    const uuid = maybePanelId ?? v4();

    if (serializedState) currentChildState[uuid] = serializedState;

    return uuid;
  };

  const addNewPanel = async <ApiType>(
    panelPackage: PanelPackage,
    options?: {
      displaySuccessMessage?: boolean;
      scrollToPanel?: boolean;
      beside?: string;
    },
    grid?: DashboardPanel['grid']
  ) => {
    const uuid = createPanel(panelPackage);
    const { serializedState, panelType } = panelPackage;
    usageCollectionService?.reportUiCounter(DASHBOARD_UI_METRIC_ID, METRIC_TYPE.CLICK, panelType);

    layout$.next(await placeNewPanel(uuid, panelPackage, grid, options?.beside));

    const { scrollToPanel, displaySuccessMessage } = {
      scrollToPanel: true,
      displaySuccessMessage: false,
      ...options,
    };
    if (displaySuccessMessage) {
      const title = (serializedState as SerializedTitles)?.title;
      coreServices.notifications.toasts.addSuccess({
        title: getPanelAddedSuccessString(title),
        'data-test-subj': 'addEmbeddableToDashboardSuccess',
      });
    }
    if (scrollToPanel) {
      trackPanel.setScrollToPanelId(uuid);
    }
    trackPanel.setHighlightPanelId(uuid);
    return (await getChildApi(uuid)) as ApiType;
  };

  const removePanel = (uuid: string) => {
    const currentLayout = layout$.value;
    const panels = { ...currentLayout.panels };
    const pinnedPanels = { ...currentLayout.pinnedPanels };
    if (panels[uuid]) {
      delete panels[uuid];
      layout$.next({ ...layout$.value, panels });
    } else if (pinnedPanels[uuid]) {
      delete pinnedPanels[uuid];
      // Recompute the order of the remaining pinned panels
      const newPinnedPanels: typeof pinnedPanels = Object.entries(pinnedPanels)
        .sort(([, a], [, b]) => a.order - b.order)
        .reduce(
          (result, [key, value], i) => ({ ...result, [key as string]: { ...value, order: i } }),
          {}
        );
      layout$.next({ ...layout$.value, pinnedPanels: newPinnedPanels });
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
    const existingPinnedPanelData = layout$.value.pinnedPanels[idToRemove];
    if (!existingGridData && !existingPinnedPanelData) throw new PanelNotFoundError();

    removePanel(idToRemove);
    if (existingGridData) {
      const newPanel = await addNewPanel<DefaultEmbeddableApi>(
        panelPackage,
        { displaySuccessMessage: false },
        existingGridData
      );
      return newPanel.uuid;
    } else {
      const prevLayoutState = pick(existingPinnedPanelData, 'grow', 'width', 'order');
      const newPanel = await addPinnedPanel(panelPackage, prevLayoutState);
      return newPanel.uuid;
    }
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
    (serializedState as SerializedTitles).title = newTitle;

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

  const pinPanel = (uuid: string, panelToPin: DashboardPinnablePanel) => {
    // add control panel to the end of the pinned panels
    const newPinnedPanels = { ...layout$.getValue().pinnedPanels };

    newPinnedPanels[uuid] = {
      type: panelToPin.type as PinnedControlLayoutState['type'],
      order: panelToPin.order ?? Object.keys(newPinnedPanels).length,
      width: panelToPin.width ?? DEFAULT_CONTROL_WIDTH,
      grow: panelToPin.grow ?? DEFAULT_CONTROL_GROW,
    };
    const newPanels = { ...layout$.getValue().panels };
    delete newPanels[uuid];

    // update the layout with the control panel removed and added as a pinned control
    layout$.next({ ...layout$.getValue(), panels: newPanels, pinnedPanels: newPinnedPanels });
  };

  const addPinnedPanel = async (
    panelPackage: PanelPackage,
    prevLayoutState?: Partial<PinnedControlLayoutState>
  ) => {
    const newPanelUuid = createPanel(panelPackage);
    const { serializedState } = panelPackage;
    const layoutState = {
      ...(serializedState ? pick(serializedState, 'grow', 'width') : {}),
      ...prevLayoutState,
    };
    const panelToPin = {
      type: panelPackage.panelType,
      ...layoutState,
    };
    pinPanel(newPanelUuid, panelToPin);
    return (await getChildApi(newPanelUuid)) ?? { uuid: newPanelUuid };
  };

  const getChildApi = async (uuid: string): Promise<DefaultEmbeddableApi | undefined> => {
    const { panels, pinnedPanels } = layout$.value;
    // Typescript erroneously believes panels[uuid] cannot be undefined, so we need to add these Object.hasOwn
    // checks to get the type signature of panelLayout to be correct
    const panelLayout = Object.hasOwn(panels, uuid)
      ? panels[uuid]
      : Object.hasOwn(pinnedPanels, uuid)
      ? pinnedPanels[uuid]
      : undefined;
    if (!panelLayout) throw new PanelNotFoundError();
    if (children$.value[uuid]) return children$.value[uuid];

    // if the panel is in a collapsed section and has never been built, then childApi will be undefined
    if (isDashboardLayoutPanel(panelLayout) && isSectionCollapsed(panelLayout.grid.sectionId)) {
      return undefined;
    }

    return new Promise((resolve) => {
      const subscription = merge(children$, layout$).subscribe(() => {
        if (children$.value[uuid]) {
          subscription.unsubscribe();
          resolve(children$.value[uuid]);
        }

        // If we hit this, the panel was removed before the embeddable finished loading.
        if (!Object.hasOwn(panels, uuid) && !Object.hasOwn(pinnedPanels, uuid)) {
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
      gridLayout$,
      childrenLoading$,
      reset: resetLayout,
      serializeLayout: () => serializeLayout(layout$.value, currentChildState),

      startComparing: (
        lastSavedState$: BehaviorSubject<DashboardState>
      ): Observable<{
        panels?: DashboardState['panels'];
        pinned_panels?: DashboardState['pinned_panels'];
      }> => {
        return combineLatest([layout$, childrenChanges$]).pipe(
          debounceTime(100),
          combineLatestWith(
            lastSavedState$.pipe(
              map((lastSaved) => deserializeLayout(lastSaved.panels, lastSaved.pinned_panels)),
              tap(({ layout, childState }) => {
                lastSavedChildState = childState;
                lastSavedLayout = layout;
              })
            )
          ),
          map(([[currentLayout, childrenChanges]]) => {
            const hasPanelChanges =
              childrenChanges.some(
                (childChanges) =>
                  childChanges.hasUnsavedChanges && childChanges.uuid in currentLayout.panels
              ) || !arePanelLayoutsEqual(lastSavedLayout, currentLayout);
            const hasPinnedPanelChanges =
              childrenChanges.some(
                (childChanges) =>
                  childChanges.hasUnsavedChanges && childChanges.uuid in currentLayout.pinnedPanels
              ) || !arePinnedPanelLayoutsEqual(lastSavedLayout, currentLayout);

            if (!hasPanelChanges && !hasPinnedPanelChanges) {
              return {};
            }

            const { pinned_panels, panels } = serializeLayout(currentLayout, currentChildState);
            if (shouldLogStateDiff()) {
              const { pinned_panels: oldPinnedPanels, panels: oldPanels } = serializeLayout(
                lastSavedLayout,
                lastSavedChildState
              );
              if (hasPanelChanges) {
                logStateDiff('dashboard panels', oldPanels, panels);
              }
              if (hasPinnedPanelChanges) {
                logStateDiff('dashboard pinned panels', oldPinnedPanels, pinned_panels);
              }
            }

            return {
              ...(hasPanelChanges ? { panels } : {}),
              ...(hasPinnedPanelChanges ? { pinned_panels } : {}),
            };
          })
        );
      },

      isSectionCollapsed,
    },
    api: {
      layout$,
      getLayout: (id: string) => {
        const layout = layout$.getValue();
        return layout.panels[id] ?? layout.pinnedPanels[id];
      },
      setLayout: (id: string, newLayout: DashboardLayoutPanel | PinnedPanelLayoutState) => {
        const layout = { ...layout$.getValue() };
        if (layout.panels[id] && 'grid' in newLayout) {
          layout.panels[id] = newLayout;
        } else if (layout.pinnedPanels[id] && 'width' in newLayout) {
          layout.pinnedPanels[id] = newLayout;
        }
        layout$.next(layout);
      },
      registerChildApi: (api: DefaultEmbeddableApi) => {
        children$.next({
          ...children$.value,
          [api.uuid]: api,
        });
      },

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

      /** Pinned panels (only controls can currently be pinned) */
      panelIsPinned: (uuid: string) => {
        return Object.keys(layout$.getValue().pinnedPanels).includes(uuid);
      },
      unpinPanel: (uuid: string) => {
        const panelToUnpin = layout$.getValue().pinnedPanels[uuid];
        if (!panelToUnpin) return;

        const newPinnedPanels = { ...layout$.getValue().pinnedPanels };
        const originalOrder = newPinnedPanels[uuid].order;
        delete newPinnedPanels[uuid];
        // adjust the order of the remaining pinned panels
        for (const panelId of Object.keys(newPinnedPanels)) {
          if (newPinnedPanels[panelId].order > originalOrder) newPinnedPanels[panelId].order--;
        }

        // place the new control panel in the top left corner, bumping other panels down as necessary
        const { newPanelPlacement, otherPanels } = runPanelPlacementStrategy(
          PanelPlacementStrategy.placeAtTop,
          {
            currentPanels: layout$.value.panels,
            height: 2,
            width: 12,
          }
        );

        // update the layout with the pinned control removed and added as a panel
        layout$.next({
          ...layout$.getValue(),
          panels: {
            ...otherPanels,
            [uuid]: {
              type: panelToUnpin.type,
              grid: { ...newPanelPlacement },
            },
          },
          pinnedPanels: newPinnedPanels,
        });
      },
      pinPanel: (uuid: string) => {
        const controlToPin = layout$.getValue().panels[uuid];
        if (!controlToPin) return;

        pinPanel(uuid, controlToPin);
      },
      addPinnedPanel,

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
          grid: { y: maxY },
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
      getPanelSection: (uuid: string) => {
        return layout$.getValue().panels[uuid]?.grid?.sectionId;
      },
      panelSection$: (uuid: string) => {
        return layout$.pipe(
          // pinned panels and panels in global section are treated identically; i.e. their section is `undefined`
          map((layout) => layout.panels[uuid]?.grid?.sectionId),
          distinctUntilChanged() // only trigger re-fetch when section changes
        );
      },
    },
    cleanup: () => {
      childrenChangesSubscription.unsubscribe();
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
