/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { History } from 'history';

import _, { uniqBy } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { merge, Observable, pipe } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  startWith,
  switchMap,
} from 'rxjs/operators';

import { DashboardCapabilities } from './types';
import { DashboardConstants } from '../dashboard_constants';
import { DashboardStateManager } from './dashboard_state_manager';
import { convertSavedDashboardPanelToPanelState } from '../../common/embeddable/embeddable_saved_object_converters';
import {
  DashboardPanelState,
  DashboardContainer,
  DashboardContainerInput,
  SavedDashboardPanel,
} from '.';

import { getQueryParams } from '../services/kibana_utils';
import { EmbeddablePackageState, isErrorEmbeddable } from '../services/embeddable';
import {
  esFilters,
  FilterManager,
  IndexPattern,
  IndexPatternsContract,
  QueryStart,
} from '../services/data';

export const getChangesFromAppStateForContainerState = ({
  dashboardContainer,
  appStateDashboardInput,
}: {
  dashboardContainer: DashboardContainer;
  appStateDashboardInput: DashboardContainerInput;
}) => {
  if (!dashboardContainer || isErrorEmbeddable(dashboardContainer)) {
    return appStateDashboardInput;
  }
  const containerInput = dashboardContainer.getInput();
  const differences: Partial<DashboardContainerInput> = {};

  // Filters shouldn't  be compared using regular isEqual
  if (
    !esFilters.compareFilters(
      containerInput.filters,
      appStateDashboardInput.filters,
      esFilters.COMPARE_ALL_OPTIONS
    )
  ) {
    differences.filters = appStateDashboardInput.filters;
  }

  Object.keys(
    _.omit(containerInput, [
      'filters',
      'searchSessionId',
      'lastReloadRequestTime',
      'switchViewMode',
    ])
  ).forEach((key) => {
    const containerValue = (containerInput as { [key: string]: unknown })[key];
    const appStateValue = ((appStateDashboardInput as unknown) as { [key: string]: unknown })[key];
    if (!_.isEqual(containerValue, appStateValue)) {
      (differences as { [key: string]: unknown })[key] = appStateValue;
    }
  });

  // last reload request time can be undefined without causing a refresh
  if (
    appStateDashboardInput.lastReloadRequestTime &&
    containerInput.lastReloadRequestTime !== appStateDashboardInput.lastReloadRequestTime
  ) {
    differences.lastReloadRequestTime = appStateDashboardInput.lastReloadRequestTime;
  }

  // cloneDeep hack is needed, as there are multiple places, where container's input mutated,
  // but values from appStateValue are deeply frozen, as they can't be mutated directly
  return Object.values(differences).length === 0 ? undefined : _.cloneDeep(differences);
};

export const getDashboardContainerInput = ({
  query,
  searchSessionId,
  incomingEmbeddable,
  isEmbeddedExternally,
  lastReloadRequestTime,
  dashboardStateManager,
  dashboardCapabilities,
}: {
  dashboardCapabilities: DashboardCapabilities;
  dashboardStateManager: DashboardStateManager;
  incomingEmbeddable?: EmbeddablePackageState;
  lastReloadRequestTime?: number;
  isEmbeddedExternally: boolean;
  searchSessionId?: string;
  query: QueryStart;
}): DashboardContainerInput => {
  const embeddablesMap: {
    [key: string]: DashboardPanelState;
  } = {};
  dashboardStateManager.getPanels().forEach((panel: SavedDashboardPanel) => {
    embeddablesMap[panel.panelIndex] = convertSavedDashboardPanelToPanelState(panel);
  });

  // If the incoming embeddable state's id already exists in the embeddables map, replace the input, retaining the existing gridData for that panel.
  if (incomingEmbeddable?.embeddableId && embeddablesMap[incomingEmbeddable.embeddableId]) {
    const originalPanelState = embeddablesMap[incomingEmbeddable.embeddableId];
    embeddablesMap[incomingEmbeddable.embeddableId] = {
      gridData: originalPanelState.gridData,
      type: incomingEmbeddable.type,
      explicitInput: {
        ...originalPanelState.explicitInput,
        ...incomingEmbeddable.input,
        id: incomingEmbeddable.embeddableId,
      },
    };
  }

  return {
    refreshConfig: query.timefilter.timefilter.getRefreshInterval(),
    hidePanelTitles: dashboardStateManager.getHidePanelTitles(),
    isFullScreenMode: dashboardStateManager.getFullScreenMode(),
    expandedPanelId: dashboardStateManager.getExpandedPanelId(),
    description: dashboardStateManager.getDescription(),
    id: dashboardStateManager.savedDashboard.id || '',
    useMargins: dashboardStateManager.getUseMargins(),
    syncColors: dashboardStateManager.getSyncColors(),
    viewMode: dashboardStateManager.getViewMode(),
    filters: query.filterManager.getFilters(),
    query: dashboardStateManager.getQuery(),
    title: dashboardStateManager.getTitle(),
    panels: embeddablesMap,
    lastReloadRequestTime,
    dashboardCapabilities,
    isEmbeddedExternally,
    searchSessionId,
    timeRange: {
      ..._.cloneDeep(query.timefilter.timefilter.getTime()),
    },
  };
};

export const getInputSubscription = ({
  dashboardContainer,
  dashboardStateManager,
  filterManager,
}: {
  dashboardContainer: DashboardContainer;
  dashboardStateManager: DashboardStateManager;
  filterManager: FilterManager;
}) =>
  dashboardContainer.getInput$().subscribe(() => {
    // This has to be first because handleDashboardContainerChanges causes
    // appState.save which will cause refreshDashboardContainer to be called.

    if (
      !esFilters.compareFilters(
        dashboardContainer.getInput().filters,
        filterManager.getFilters(),
        esFilters.COMPARE_ALL_OPTIONS
      )
    ) {
      // Add filters modifies the object passed to it, hence the clone deep.
      filterManager.addFilters(_.cloneDeep(dashboardContainer.getInput().filters));

      dashboardStateManager.applyFilters(
        dashboardStateManager.getQuery(),
        dashboardContainer.getInput().filters
      );
    }

    dashboardStateManager.handleDashboardContainerChanges(dashboardContainer);
  });

export const getOutputSubscription = ({
  dashboardContainer,
  indexPatterns,
  onUpdateIndexPatterns,
}: {
  dashboardContainer: DashboardContainer;
  indexPatterns: IndexPatternsContract;
  onUpdateIndexPatterns: (newIndexPatterns: IndexPattern[]) => void;
}) => {
  const updateIndexPatternsOperator = pipe(
    filter((container: DashboardContainer) => !!container && !isErrorEmbeddable(container)),
    map((container: DashboardContainer): IndexPattern[] => {
      let panelIndexPatterns: IndexPattern[] = [];
      Object.values(container.getChildIds()).forEach((id) => {
        const embeddableInstance = container.getChild(id);
        if (isErrorEmbeddable(embeddableInstance)) return;
        const embeddableIndexPatterns = (embeddableInstance.getOutput() as any).indexPatterns;
        if (!embeddableIndexPatterns) return;
        panelIndexPatterns.push(...embeddableIndexPatterns);
      });
      panelIndexPatterns = uniqBy(panelIndexPatterns, 'id');
      return panelIndexPatterns;
    }),
    distinctUntilChanged((a, b) =>
      deepEqual(
        a.map((ip) => ip.id),
        b.map((ip) => ip.id)
      )
    ),
    // using switchMap for previous task cancellation
    switchMap((panelIndexPatterns: IndexPattern[]) => {
      return new Observable((observer) => {
        if (panelIndexPatterns && panelIndexPatterns.length > 0) {
          if (observer.closed) return;
          onUpdateIndexPatterns(panelIndexPatterns);
          observer.complete();
        } else {
          indexPatterns.getDefault().then((defaultIndexPattern) => {
            if (observer.closed) return;
            onUpdateIndexPatterns([defaultIndexPattern as IndexPattern]);
            observer.complete();
          });
        }
      });
    })
  );

  return merge(
    // output of dashboard container itself
    dashboardContainer.getOutput$(),
    // plus output of dashboard container children,
    // children may change, so make sure we subscribe/unsubscribe with switchMap
    dashboardContainer.getOutput$().pipe(
      map(() => dashboardContainer!.getChildIds()),
      distinctUntilChanged(deepEqual),
      switchMap((newChildIds: string[]) =>
        merge(...newChildIds.map((childId) => dashboardContainer!.getChild(childId).getOutput$()))
      )
    )
  )
    .pipe(
      mapTo(dashboardContainer),
      startWith(dashboardContainer), // to trigger initial index pattern update
      updateIndexPatternsOperator
    )
    .subscribe();
};

export const getFiltersSubscription = ({
  query,
  dashboardStateManager,
}: {
  query: QueryStart;
  dashboardStateManager: DashboardStateManager;
}) => {
  return merge(query.filterManager.getUpdates$(), query.queryString.getUpdates$())
    .pipe(debounceTime(100))
    .subscribe(() => {
      dashboardStateManager.applyFilters(
        query.queryString.getQuery(),
        query.filterManager.getFilters()
      );
    });
};

export const getSearchSessionIdFromURL = (history: History): string | undefined =>
  getQueryParams(history.location)[DashboardConstants.SEARCH_SESSION_ID] as string | undefined;
