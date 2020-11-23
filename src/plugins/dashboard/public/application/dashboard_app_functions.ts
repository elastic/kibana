/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { History } from 'history';

import _, { uniqBy } from 'lodash';
import deepEqual from 'fast-deep-equal';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  startWith,
  switchMap,
} from 'rxjs/operators';
import { merge, Observable, pipe } from 'rxjs';
import { DashboardStateManager } from './dashboard_state_manager';
import { getQueryParams } from '../../../kibana_utils/public';
import { DashboardCapabilities } from './types';
import {
  esFilters,
  FilterManager,
  IndexPattern,
  IndexPatternsContract,
  QueryStart,
} from '../../../data/public';
import { EmbeddablePackageState, isErrorEmbeddable } from '../../../embeddable/public';
import { DashboardPanelState } from '.';
import { convertSavedDashboardPanelToPanelState } from '../../common/embeddable/embeddable_saved_object_converters';
import {
  DashboardConstants,
  DashboardContainer,
  DashboardContainerInput,
  SavedDashboardPanel,
} from '..';

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
    _.omit(containerInput, ['filters', 'searchSessionId', 'lastReloadRequestTime'])
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
    id: dashboardStateManager.savedDashboard.id || '',
    filters: query.filterManager.getFilters(),
    hidePanelTitles: dashboardStateManager.getHidePanelTitles(),
    query: dashboardStateManager.getQuery(),
    searchSessionId,
    timeRange: {
      ..._.cloneDeep(query.timefilter.timefilter.getTime()),
    },
    refreshConfig: query.timefilter.timefilter.getRefreshInterval(),
    viewMode: dashboardStateManager.getViewMode(),
    panels: embeddablesMap,
    isFullScreenMode: dashboardStateManager.getFullScreenMode(),
    isEmbeddedExternally,
    useMargins: dashboardStateManager.getUseMargins(),
    lastReloadRequestTime,
    dashboardCapabilities,
    title: dashboardStateManager.getTitle(),
    description: dashboardStateManager.getDescription(),
    expandedPanelId: dashboardStateManager.getExpandedPanelId(),
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
