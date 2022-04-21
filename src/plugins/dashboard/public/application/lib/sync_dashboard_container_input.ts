/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { Subscription } from 'rxjs';
import { debounceTime, tap } from 'rxjs/operators';

import { compareFilters, COMPARE_ALL_OPTIONS, type Filter } from '@kbn/es-query';
import { DashboardContainer } from '../embeddable';
import { Query } from '../../services/data';
import { DashboardConstants, DashboardSavedObject } from '../..';
import {
  setControlGroupState,
  setExpandedPanelId,
  setFullScreenMode,
  setPanels,
  setQuery,
  setTimeRange,
} from '../state';
import { diffDashboardContainerInput } from './diff_dashboard_state';
import { replaceUrlHashQuery } from '../../../../kibana_utils/public';
import { DashboardBuildContext, DashboardContainerInput } from '../../types';
import {
  getSearchSessionIdFromURL,
  getSessionURLObservable,
  stateToDashboardContainerInput,
} from '.';

type SyncDashboardContainerCommon = DashboardBuildContext & {
  dashboardContainer: DashboardContainer;
  savedDashboard: DashboardSavedObject;
};

type ApplyStateChangesToContainerProps = SyncDashboardContainerCommon & {
  force: boolean;
};

type ApplyContainerChangesToStateProps = SyncDashboardContainerCommon & {
  applyFilters: (query: Query, filters: Filter[]) => void;
};

type SyncDashboardContainerProps = SyncDashboardContainerCommon & ApplyContainerChangesToStateProps;

/**
 * Sets up two way binding between dashboard container and redux state.
 */
export const syncDashboardContainerInput = (
  syncDashboardContainerProps: SyncDashboardContainerProps
) => {
  const { history, dashboardContainer, $onDashboardStateChange, $triggerDashboardRefresh } =
    syncDashboardContainerProps;
  const subscriptions = new Subscription();
  subscriptions.add(
    dashboardContainer
      .getInput$()
      .subscribe(() => applyContainerChangesToState(syncDashboardContainerProps))
  );
  subscriptions.add($onDashboardStateChange.subscribe(() => $triggerDashboardRefresh.next({})));
  subscriptions.add(
    getSessionURLObservable(history).subscribe(() => {
      $triggerDashboardRefresh.next({ force: true });
    })
  );

  let forceRefresh: boolean = false;
  subscriptions.add(
    $triggerDashboardRefresh
      .pipe(
        tap((trigger) => {
          forceRefresh = forceRefresh || (trigger?.force ?? false);
        }),
        debounceTime(DashboardConstants.CHANGE_APPLY_DEBOUNCE)
      )
      .subscribe(() => {
        applyStateChangesToContainer({ ...syncDashboardContainerProps, force: forceRefresh });

        // If this dashboard has a control group, reload the control group when the refresh button is manually pressed.
        if (forceRefresh && dashboardContainer.controlGroup) {
          dashboardContainer.controlGroup.reload();
        }
        forceRefresh = false;
      })
  );

  return () => subscriptions.unsubscribe();
};

export const applyContainerChangesToState = ({
  query,
  applyFilters,
  dashboardContainer,
  getLatestDashboardState,
  dispatchDashboardStateChange,
}: ApplyContainerChangesToStateProps) => {
  const input = dashboardContainer.getInput();
  const latestState = getLatestDashboardState();
  if (Object.keys(latestState).length === 0) {
    return;
  }
  const { filterManager } = query;
  if (!compareFilters(input.filters, filterManager.getFilters(), COMPARE_ALL_OPTIONS)) {
    // Add filters modifies the object passed to it, hence the clone deep.
    filterManager.addFilters(_.cloneDeep(input.filters));
    applyFilters(latestState.query, input.filters);
  }

  if (!_.isEqual(input.panels, latestState.panels)) {
    dispatchDashboardStateChange(setPanels(input.panels));
  }

  if (!_.isEqual(input.query, latestState.query)) {
    dispatchDashboardStateChange(setQuery(input.query));
  }

  if (input.timeRestore && !_.isEqual(input.timeRange, latestState.timeRange)) {
    dispatchDashboardStateChange(setTimeRange(input.timeRange));
  }

  if (!_.isEqual(input.expandedPanelId, latestState.expandedPanelId)) {
    dispatchDashboardStateChange(setExpandedPanelId(input.expandedPanelId));
  }

  if (!_.isEqual(input.controlGroupInput, latestState.controlGroupInput)) {
    dispatchDashboardStateChange(setControlGroupState(input.controlGroupInput));
  }
  dispatchDashboardStateChange(setFullScreenMode(input.isFullScreenMode));
};

export const applyStateChangesToContainer = ({
  force,
  search,
  history,
  savedDashboard,
  dashboardContainer,
  kbnUrlStateStorage,
  query: queryService,
  isEmbeddedExternally,
  dashboardCapabilities,
  getLatestDashboardState,
}: ApplyStateChangesToContainerProps) => {
  const latestState = getLatestDashboardState();
  if (Object.keys(latestState).length === 0) {
    return;
  }
  const currentDashboardStateAsInput = stateToDashboardContainerInput({
    dashboardState: latestState,
    isEmbeddedExternally,
    dashboardCapabilities,
    query: queryService,
    savedDashboard,
  });
  const differences = diffDashboardContainerInput(
    dashboardContainer.getInput(),
    currentDashboardStateAsInput
  );
  if (force) {
    differences.lastReloadRequestTime = Date.now();
  }

  if (Object.keys(differences).length !== 0) {
    const shouldRefetch = Object.keys(differences).some(
      (changeKey) => !noRefetchKeys.includes(changeKey as keyof DashboardContainerInput)
    );

    const newSearchSessionId: string | undefined = (() => {
      // do not update session id if this is irrelevant state change to prevent excessive searches
      if (!shouldRefetch) return;

      const sessionApi = search.session;
      let searchSessionIdFromURL = getSearchSessionIdFromURL(history);
      if (searchSessionIdFromURL) {
        if (sessionApi.isRestore() && sessionApi.isCurrentSession(searchSessionIdFromURL)) {
          // navigating away from a restored session
          kbnUrlStateStorage.kbnUrlControls.updateAsync((nextUrl) => {
            if (nextUrl.includes(DashboardConstants.SEARCH_SESSION_ID)) {
              return replaceUrlHashQuery(nextUrl, (query) => {
                delete query[DashboardConstants.SEARCH_SESSION_ID];
                return query;
              });
            }
            return nextUrl;
          });
          searchSessionIdFromURL = undefined;
        } else {
          sessionApi.restore(searchSessionIdFromURL);
        }
      }

      return searchSessionIdFromURL ?? sessionApi.start();
    })();

    dashboardContainer.updateInput({
      ...differences,
      ...(newSearchSessionId && { searchSessionId: newSearchSessionId }),
    });
  }
};

const noRefetchKeys: Readonly<Array<keyof DashboardContainerInput>> = [
  'title',
  'viewMode',
  'useMargins',
  'description',
  'expandedPanelId',
  'isFullScreenMode',
  'isEmbeddedExternally',
] as const;
