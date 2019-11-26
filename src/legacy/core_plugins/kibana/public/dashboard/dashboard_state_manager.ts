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

import { i18n } from '@kbn/i18n';
import _ from 'lodash';

import { Moment } from 'moment';

import { DashboardContainer } from 'src/legacy/core_plugins/dashboard_embeddable_container/public/np_ready/public';
import { ViewMode } from '../../../../../../src/plugins/embeddable/public';
import {
  stateMonitorFactory,
  StateMonitor,
  AppStateClass as TAppStateClass,
  migrateLegacyQuery,
} from './legacy_imports';
import {
  Query,
  esFilters,
  TimefilterContract as Timefilter,
} from '../../../../../../src/plugins/data/public';

import { getAppStateDefaults, migrateAppState } from './lib';
import { convertPanelStateToSavedDashboardPanel } from './lib/embeddable_saved_object_converters';
import { FilterUtils } from './lib/filter_utils';
import { SavedObjectDashboard } from './saved_dashboard/saved_dashboard';

import { SavedDashboardPanel, DashboardAppState, DashboardAppStateDefaults } from './types';

/**
 * Dashboard state manager handles connecting angular and redux state between the angular and react portions of the
 * app. There are two "sources of truth" that need to stay in sync - AppState (aka the `_a` portion of the url) and
 * the Store. They aren't complete duplicates of each other as AppState has state that the Store doesn't, and vice
 * versa. They should be as decoupled as possible so updating the store won't affect bwc of urls.
 */
export class DashboardStateManager {
  public savedDashboard: SavedObjectDashboard;
  public appState: DashboardAppState;
  public lastSavedDashboardFilters: {
    timeTo?: string | Moment;
    timeFrom?: string | Moment;
    filterBars: esFilters.Filter[];
    query: Query;
  };
  private stateDefaults: DashboardAppStateDefaults;
  private hideWriteControls: boolean;
  private kibanaVersion: string;
  public isDirty: boolean;
  private changeListeners: Array<(status: { dirty: boolean }) => void>;
  private stateMonitor: StateMonitor<DashboardAppStateDefaults>;

  /**
   *
   * @param savedDashboard
   * @param AppState The AppState class to use when instantiating a new AppState instance.
   * @param hideWriteControls true if write controls should be hidden.
   */
  constructor({
    savedDashboard,
    AppStateClass,
    hideWriteControls,
    kibanaVersion,
  }: {
    savedDashboard: SavedObjectDashboard;
    AppStateClass: TAppStateClass<DashboardAppState>;
    hideWriteControls: boolean;
    kibanaVersion: string;
  }) {
    this.kibanaVersion = kibanaVersion;
    this.savedDashboard = savedDashboard;
    this.hideWriteControls = hideWriteControls;

    this.stateDefaults = getAppStateDefaults(this.savedDashboard, this.hideWriteControls);

    this.appState = new AppStateClass(this.stateDefaults);

    // Initializing appState does two things - first it translates the defaults into AppState, second it updates
    // appState based on the URL (the url trumps the defaults). This means if we update the state format at all and
    // want to handle BWC, we must not only migrate the data stored with saved Dashboard, but also any old state in the
    // url.
    migrateAppState(this.appState, kibanaVersion);

    this.isDirty = false;

    // We can't compare the filters stored on this.appState to this.savedDashboard because in order to apply
    // the filters to the visualizations, we need to save it on the dashboard. We keep track of the original
    // filter state in order to let the user know if their filters changed and provide this specific information
    // in the 'lose changes' warning message.
    this.lastSavedDashboardFilters = this.getFilterState();

    /**
     * Creates a state monitor and saves it to this.stateMonitor. Used to track unsaved changes made to appState.
     */
    this.stateMonitor = stateMonitorFactory.create<DashboardAppStateDefaults>(
      this.appState,
      this.stateDefaults
    );

    this.stateMonitor.ignoreProps('viewMode');
    // Filters need to be compared manually because they sometimes have a $$hashkey stored on the object.
    this.stateMonitor.ignoreProps('filters');
    // Query needs to be compared manually because saved legacy queries get migrated in app state automatically
    this.stateMonitor.ignoreProps('query');

    this.stateMonitor.onChange((status: { dirty: boolean }) => {
      this.isDirty = status.dirty;
    });

    this.changeListeners = [];

    this.stateMonitor.onChange((status: { dirty: boolean }) => {
      this.changeListeners.forEach(listener => listener(status));
    });
  }

  public registerChangeListener(callback: (status: { dirty: boolean }) => void) {
    this.changeListeners.push(callback);
  }

  public handleDashboardContainerChanges(dashboardContainer: DashboardContainer) {
    let dirty = false;

    const savedDashboardPanelMap: { [key: string]: SavedDashboardPanel } = {};

    const input = dashboardContainer.getInput();
    this.getPanels().forEach(savedDashboardPanel => {
      if (input.panels[savedDashboardPanel.panelIndex] !== undefined) {
        savedDashboardPanelMap[savedDashboardPanel.panelIndex] = savedDashboardPanel;
      } else {
        // A panel was deleted.
        dirty = true;
      }
    });

    const convertedPanelStateMap: { [key: string]: SavedDashboardPanel } = {};

    Object.values(input.panels).forEach(panelState => {
      if (savedDashboardPanelMap[panelState.explicitInput.id] === undefined) {
        dirty = true;
      }

      convertedPanelStateMap[panelState.explicitInput.id] = convertPanelStateToSavedDashboardPanel(
        panelState,
        this.kibanaVersion
      );

      if (
        !_.isEqual(
          convertedPanelStateMap[panelState.explicitInput.id],
          savedDashboardPanelMap[panelState.explicitInput.id]
        )
      ) {
        // A panel was changed
        dirty = true;
      }
    });

    if (dirty) {
      this.appState.panels = Object.values(convertedPanelStateMap);
    }

    if (input.isFullScreenMode !== this.getFullScreenMode()) {
      this.setFullScreenMode(input.isFullScreenMode);
    }

    if (!_.isEqual(input.query, this.getQuery())) {
      this.setQuery(input.query);
    }

    this.changeListeners.forEach(listener => listener({ dirty }));
    this.saveState();
  }

  public getFullScreenMode() {
    return this.appState.fullScreenMode;
  }

  public setFullScreenMode(fullScreenMode: boolean) {
    this.appState.fullScreenMode = fullScreenMode;
    this.saveState();
  }

  /**
   * Resets the state back to the last saved version of the dashboard.
   */
  public resetState() {
    // In order to show the correct warning, we have to store the unsaved
    // title on the dashboard object. We should fix this at some point, but this is how all the other object
    // save panels work at the moment.
    this.savedDashboard.title = this.savedDashboard.lastSavedTitle;

    // appState.reset uses the internal defaults to reset the state, but some of the default settings (e.g. the panels
    // array) point to the same object that is stored on appState and is getting modified.
    // The right way to fix this might be to ensure the defaults object stored on state is a deep
    // clone, but given how much code uses the state object, I determined that to be too risky of a change for
    // now.  TODO: revisit this!
    this.stateDefaults = getAppStateDefaults(this.savedDashboard, this.hideWriteControls);
    // The original query won't be restored by the above because the query on this.savedDashboard is applied
    // in place in order for it to affect the visualizations.
    this.stateDefaults.query = this.lastSavedDashboardFilters.query;
    // Need to make a copy to ensure they are not overwritten.
    this.stateDefaults.filters = [...this.getLastSavedFilterBars()];

    this.isDirty = false;
    this.appState.setDefaults(this.stateDefaults);
    this.appState.reset();
    this.stateMonitor.setInitialState(this.appState.toJSON());
  }

  /**
   * Returns an object which contains the current filter state of this.savedDashboard.
   */
  public getFilterState() {
    return {
      timeTo: this.savedDashboard.timeTo,
      timeFrom: this.savedDashboard.timeFrom,
      filterBars: this.savedDashboard.getFilters(),
      query: this.savedDashboard.getQuery(),
    };
  }

  public getTitle() {
    return this.appState.title;
  }

  public isSaved() {
    return !!this.savedDashboard.id;
  }

  public isNew() {
    return !this.isSaved();
  }

  public getDescription() {
    return this.appState.description;
  }

  public setDescription(description: string) {
    this.appState.description = description;
    this.saveState();
  }

  public setTitle(title: string) {
    this.appState.title = title;
    this.savedDashboard.title = title;
    this.saveState();
  }

  public getAppState() {
    return this.appState;
  }

  public getQuery(): Query {
    return migrateLegacyQuery(this.appState.query);
  }

  public getSavedQueryId() {
    return this.appState.savedQuery;
  }

  public setSavedQueryId(id?: string) {
    this.appState.savedQuery = id;
    this.saveState();
  }

  public getUseMargins() {
    // Existing dashboards that don't define this should default to false.
    return this.appState.options.useMargins === undefined
      ? false
      : this.appState.options.useMargins;
  }

  public setUseMargins(useMargins: boolean) {
    this.appState.options.useMargins = useMargins;
    this.saveState();
  }

  public getHidePanelTitles() {
    return this.appState.options.hidePanelTitles;
  }

  public setHidePanelTitles(hidePanelTitles: boolean) {
    this.appState.options.hidePanelTitles = hidePanelTitles;
    this.saveState();
  }

  public getTimeRestore() {
    return this.appState.timeRestore;
  }

  public setTimeRestore(timeRestore: boolean) {
    this.appState.timeRestore = timeRestore;
    this.saveState();
  }

  public getIsTimeSavedWithDashboard() {
    return this.savedDashboard.timeRestore;
  }

  public getLastSavedFilterBars(): esFilters.Filter[] {
    return this.lastSavedDashboardFilters.filterBars;
  }

  public getLastSavedQuery() {
    return this.lastSavedDashboardFilters.query;
  }

  /**
   * @returns True if the query changed since the last time the dashboard was saved, or if it's a
   * new dashboard, if the query differs from the default.
   */
  public getQueryChanged() {
    const currentQuery = this.appState.query;
    const lastSavedQuery = this.getLastSavedQuery();

    const query = migrateLegacyQuery(currentQuery);

    const isLegacyStringQuery =
      _.isString(lastSavedQuery) && _.isPlainObject(currentQuery) && _.has(currentQuery, 'query');
    if (isLegacyStringQuery) {
      return lastSavedQuery !== query.query;
    }

    return !_.isEqual(currentQuery, lastSavedQuery);
  }

  /**
   * @returns True if the filter bar state has changed since the last time the dashboard was saved,
   * or if it's a new dashboard, if the query differs from the default.
   */
  public getFilterBarChanged() {
    return !_.isEqual(
      FilterUtils.cleanFiltersForComparison(this.appState.filters),
      FilterUtils.cleanFiltersForComparison(this.getLastSavedFilterBars())
    );
  }

  /**
   * @param timeFilter
   * @returns True if the time state has changed since the time saved with the dashboard.
   */
  public getTimeChanged(timeFilter: Timefilter) {
    return (
      !FilterUtils.areTimesEqual(
        this.lastSavedDashboardFilters.timeFrom,
        timeFilter.getTime().from
      ) ||
      !FilterUtils.areTimesEqual(this.lastSavedDashboardFilters.timeTo, timeFilter.getTime().to)
    );
  }

  public getViewMode() {
    return this.hideWriteControls ? ViewMode.VIEW : this.appState.viewMode;
  }

  public getIsViewMode() {
    return this.getViewMode() === ViewMode.VIEW;
  }

  public getIsEditMode() {
    return this.getViewMode() === ViewMode.EDIT;
  }

  /**
   *
   * @returns True if the dashboard has changed since the last save (or, is new).
   */
  public getIsDirty(timeFilter?: Timefilter) {
    // Filter bar comparison is done manually (see cleanFiltersForComparison for the reason) and time picker
    // changes are not tracked by the state monitor.
    const hasTimeFilterChanged = timeFilter ? this.getFiltersChanged(timeFilter) : false;
    return this.getIsEditMode() && (this.isDirty || hasTimeFilterChanged);
  }

  public getPanels(): SavedDashboardPanel[] {
    return this.appState.panels;
  }

  public updatePanel(panelIndex: string, panelAttributes: any) {
    const foundPanel = this.getPanels().find(
      (panel: SavedDashboardPanel) => panel.panelIndex === panelIndex
    );
    Object.assign(foundPanel, panelAttributes);
    this.saveState();
    return foundPanel;
  }

  /**
   * @param timeFilter
   * @returns An array of user friendly strings indicating the filter types that have changed.
   */
  public getChangedFilterTypes(timeFilter: Timefilter) {
    const changedFilters = [];
    if (this.getFilterBarChanged()) {
      changedFilters.push('filter');
    }
    if (this.getQueryChanged()) {
      changedFilters.push('query');
    }
    if (this.savedDashboard.timeRestore && this.getTimeChanged(timeFilter)) {
      changedFilters.push('time range');
    }
    return changedFilters;
  }

  /**
   * @returns True if filters (query, filter bar filters, and time picker if time is stored
   * with the dashboard) have changed since the last saved state (or if the dashboard hasn't been saved,
   * the default state).
   */
  public getFiltersChanged(timeFilter: Timefilter) {
    return this.getChangedFilterTypes(timeFilter).length > 0;
  }

  /**
   * Updates timeFilter to match the time saved with the dashboard.
   * @param timeFilter
   * @param timeFilter.setTime
   * @param timeFilter.setRefreshInterval
   */
  public syncTimefilterWithDashboard(timeFilter: Timefilter) {
    if (!this.getIsTimeSavedWithDashboard()) {
      throw new Error(
        i18n.translate('kbn.dashboard.stateManager.timeNotSavedWithDashboardErrorMessage', {
          defaultMessage: 'The time is not saved with this dashboard so should not be synced.',
        })
      );
    }

    if (this.savedDashboard.timeFrom && this.savedDashboard.timeTo) {
      timeFilter.setTime({
        from: this.savedDashboard.timeFrom,
        to: this.savedDashboard.timeTo,
      });
    }

    if (this.savedDashboard.refreshInterval) {
      timeFilter.setRefreshInterval(this.savedDashboard.refreshInterval);
    }
  }

  /**
   * Saves the current application state to the URL.
   */
  public saveState() {
    this.appState.save();
  }

  public setQuery(query: Query) {
    this.appState.query = query;
    this.saveState();
  }

  /**
   * Applies the current filter state to the dashboard.
   * @param filter An array of filter bar filters.
   */
  public applyFilters(query: Query, filters: esFilters.Filter[]) {
    this.appState.query = query;
    this.savedDashboard.searchSource.setField('query', query);
    this.savedDashboard.searchSource.setField('filter', filters);
    this.saveState();
  }

  public switchViewMode(newMode: ViewMode) {
    this.appState.viewMode = newMode;
    this.saveState();
  }

  /**
   * Destroys and cleans up this object when it's no longer used.
   */
  public destroy() {
    if (this.stateMonitor) {
      this.stateMonitor.destroy();
    }
    this.savedDashboard.destroy();
  }
}
