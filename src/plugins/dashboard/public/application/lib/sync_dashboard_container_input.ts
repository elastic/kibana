/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { debounceTime, tap } from 'rxjs/operators';

import { Subscription } from 'rxjs';
import { DashboardConstants, DashboardSavedObject } from '../..';
import { migrateLegacyQuery } from './migrate_legacy_query';
import { esFilters, Filter, Query } from '../../services/data';
import { DashboardBuildContext, SavedDashboardPanel } from '../../types';
import { DashboardContainer, DashboardContainerInput } from '../embeddable';
import {
  getSearchSessionIdFromURL,
  getSessionURLObservable,
  stateToDashboardContainerInput,
} from '.';
import { setExpandedPanelId, setFullScreenMode, setPanels, setQuery } from '../state';
import { convertPanelStateToSavedDashboardPanel } from '../../../common/embeddable/embeddable_saved_object_converters';
import { replaceUrlHashQuery } from '../../../../kibana_utils/public';
import { diffDashboardContainerInput } from './diff_dashboard_state';

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
  const {
    history,
    dashboardContainer,
    $onDashboardStateChange,
    $triggerDashboardRefresh,
  } = syncDashboardContainerProps;
  const subscriptions = new Subscription();
  subscriptions.add(
    dashboardContainer
      .getInput$()
      .subscribe(() => applyContainerChangesToState(syncDashboardContainerProps))
  );
  subscriptions.add($onDashboardStateChange.subscribe(() => $triggerDashboardRefresh.next()));
  subscriptions.add(
    getSessionURLObservable(history).subscribe((queryId) => {
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
        debounceTime(50)
      )
      .subscribe(() => {
        applyStateChangesToContainer({ ...syncDashboardContainerProps, force: forceRefresh });
        forceRefresh = false;
      })
  );

  return () => subscriptions.unsubscribe();
};

export const applyContainerChangesToState = ({
  services,
  applyFilters,
  $checkIsDirty,
  kibanaVersion,
  dashboardContainer,
  getLatestDashboardState,
  dispatchDashboardStateChange,
}: ApplyContainerChangesToStateProps) => {
  const input = dashboardContainer.getInput();
  const latestState = getLatestDashboardState();
  if (Object.keys(latestState).length === 0) {
    return;
  }
  const filterManager = services.data.query.filterManager;
  if (
    !esFilters.compareFilters(
      input.filters,
      filterManager.getFilters(),
      esFilters.COMPARE_ALL_OPTIONS
    )
  ) {
    // Add filters modifies the object passed to it, hence the clone deep.
    filterManager.addFilters(_.cloneDeep(input.filters));
    applyFilters(migrateLegacyQuery(latestState.query), input.filters);
  }

  let dirty = false;

  const savedDashboardPanelMap: { [key: string]: SavedDashboardPanel } = {};
  const convertedPanelStateMap: { [key: string]: SavedDashboardPanel } = {};

  latestState.panels?.forEach((savedDashboardPanel) => {
    if (input.panels[savedDashboardPanel.panelIndex] !== undefined) {
      savedDashboardPanelMap[savedDashboardPanel.panelIndex] = savedDashboardPanel;
    } else {
      // A panel was deleted.
      dirty = true;
    }
  });
  let expandedPanelValid = false;
  Object.values(input.panels).forEach((panelState) => {
    if (savedDashboardPanelMap[panelState.explicitInput.id] === undefined) {
      dirty = true;
    }

    if (panelState.explicitInput.id === input.expandedPanelId) {
      expandedPanelValid = true;
    }

    convertedPanelStateMap[panelState.explicitInput.id] = convertPanelStateToSavedDashboardPanel(
      panelState,
      kibanaVersion
    );

    if (
      !_.isEqual(
        convertedPanelStateMap[panelState.explicitInput.id],
        savedDashboardPanelMap[panelState.explicitInput.id]
      )
    ) {
      // A panel was changed
      dirty = true;

      const oldVersion = savedDashboardPanelMap[panelState.explicitInput.id]?.version;
      const newVersion = convertedPanelStateMap[panelState.explicitInput.id]?.version;
      if (oldVersion && newVersion && oldVersion !== newVersion) {
        // TODO: Detect Migrations
      }
    }
  });
  if (dirty) {
    dispatchDashboardStateChange(setPanels(Object.values(convertedPanelStateMap)));
    // TODO: show toast when migrated
    //   if (dirtyBecauseOfInitialStateMigration) {
    //     if (this.getIsEditMode() && !this.hasShownMigrationToast) {
    //       this.toasts.addSuccess(getMigratedToastText());
    //       this.hasShownMigrationToast = true;
    //     }
    //     this.saveState({ replace: true });
    //   }
    // TODO: clear unsaved state in session storage.
    // If a panel has been changed, and the state is now equal to the state in the saved object, remove the unsaved panels
    //   if (!this.isDirty && this.getIsEditMode()) {
    //     this.clearUnsavedPanels();
    //   } else {
    //     this.setUnsavedPanels(this.getPanels());
    //   }
  }
  dispatchDashboardStateChange(
    setExpandedPanelId(expandedPanelValid ? input.expandedPanelId : undefined)
  );

  if (!_.isEqual(input.query, migrateLegacyQuery(latestState.query))) {
    dispatchDashboardStateChange(setQuery(input.query));
  }
  dispatchDashboardStateChange(setFullScreenMode(input.isFullScreenMode));
};

export const applyStateChangesToContainer = ({
  force,
  history,
  services,
  savedDashboard,
  dashboardContainer,
  kbnUrlStateStorage,
  isEmbeddedExternally,
  getLatestDashboardState,
}: ApplyStateChangesToContainerProps) => {
  const latestState = getLatestDashboardState();
  if (Object.keys(latestState).length === 0) {
    return;
  }
  const currentDashboardStateAsInput = stateToDashboardContainerInput({
    dashboardState: latestState,
    isEmbeddedExternally,
    savedDashboard,
    services,
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

      const sessionApi = services.data.search.session;
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

const noRefetchKeys: Array<keyof DashboardContainerInput> = [
  'title',
  'viewMode',
  'useMargins',
  'description',
  'expandedPanelId',
  'isFullScreenMode',
  'isEmbeddedExternally',
];
