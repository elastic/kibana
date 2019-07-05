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
import moment from 'moment';

import { DashboardViewMode } from './dashboard_view_mode';
import { FilterUtils } from './lib/filter_utils';
import { PanelUtils } from './panel/panel_utils';
import { store } from '../store';
import {
  updateViewMode,
  setPanels,
  updateUseMargins,
  updateIsFullScreenMode,
  minimizePanel,
  updateTitle,
  updateDescription,
  updateHidePanelTitles,
  updateTimeRange,
  clearStagedFilters,
  updateFilters,
  updateQuery,
  closeContextMenu,
  requestReload,
} from './actions';
import { stateMonitorFactory } from 'ui/state_management/state_monitor_factory';
import { createPanelState } from './panel';
import { getAppStateDefaults, migrateAppState } from './lib';
import {
  getViewMode,
  getFullScreenMode,
  getPanels,
  getPanel,
  getTitle,
  getDescription,
  getUseMargins,
  getHidePanelTitles,
  getStagedFilters,
  getEmbeddables,
  getEmbeddableMetadata,
  getQuery,
  getFilters,
} from '../selectors';

/**
 * Dashboard state manager handles connecting angular and redux state between the angular and react portions of the
 * app. There are two "sources of truth" that need to stay in sync - AppState (aka the `_a` portion of the url) and
 * the Store. They aren't complete duplicates of each other as AppState has state that the Store doesn't, and vice
 * versa. They should be as decoupled as possible so updating the store won't affect bwc of urls.
 */
export class DashboardStateManager {
  /**
   *
   * @param {SavedDashboard} savedDashboard
   * @param {AppState} AppState The AppState class to use when instantiating a new AppState instance.
   * @param {boolean} hideWriteControls true if write controls should be hidden.
   * @param {function} addFilter a function that can be used to add a filter bar filter
   */
  constructor({ savedDashboard, AppState, hideWriteControls, addFilter }) {
    this.savedDashboard = savedDashboard;
    this.hideWriteControls = hideWriteControls;
    this.addFilter = addFilter;

    this.stateDefaults = getAppStateDefaults(this.savedDashboard, this.hideWriteControls);

    this.appState = new AppState(this.stateDefaults);

    // Initializing appState does two things - first it translates the defaults into AppState, second it updates
    // appState based on the URL (the url trumps the defaults). This means if we update the state format at all and
    // want to handle BWC, we must not only migrate the data stored with saved Dashboard, but also any old state in the
    // url.
    migrateAppState(this.appState);

    this.isDirty = false;

    // We can't compare the filters stored on this.appState to this.savedDashboard because in order to apply
    // the filters to the visualizations, we need to save it on the dashboard. We keep track of the original
    // filter state in order to let the user know if their filters changed and provide this specific information
    // in the 'lose changes' warning message.
    this.lastSavedDashboardFilters = this.getFilterState();

    // A mapping of panel index to the index pattern it uses.
    this.panelIndexPatternMapping = {};

    PanelUtils.initPanelIndexes(this.getPanels());

    this.createStateMonitor();

    store.dispatch(closeContextMenu());

    // Always start out with all panels minimized when a dashboard is first loaded.
    store.dispatch(minimizePanel());
    this._pushAppStateChangesToStore();

    this.changeListeners = [];

    this.unsubscribe = store.subscribe(() => this._handleStoreChanges());
    this.stateMonitor.onChange(status => {
      this.changeListeners.forEach(listener => listener(status));
      this._pushAppStateChangesToStore();
    });
  }

  registerChangeListener(callback) {
    this.changeListeners.push(callback);
  }

  _areStoreAndAppStatePanelsEqual() {
    const state = store.getState();
    const storePanels = getPanels(store.getState());
    const appStatePanels = this.getPanels();

    if (Object.values(storePanels).length !== appStatePanels.length) {
      return false;
    }

    return appStatePanels.every((appStatePanel) => {
      const storePanel = getPanel(state, appStatePanel.panelIndex);
      return _.isEqual(appStatePanel, storePanel);
    });
  }

  /**
   * Time is part of global state so we need to deal with it outside of _pushAppStateChangesToStore.
   * @param {String|Object} newTimeFilter.to -- either a string representing an absolute time in utc format,
   * or a relative time (now-15m), or a moment object
   * @param {String|Object} newTimeFilter.from - either a string representing an absolute or a relative time, or a
   * moment object
   * @param {String} newTimeFilter.mode
   */
  handleTimeChange(newTimeFilter) {
    store.dispatch(updateTimeRange({
      from: FilterUtils.convertTimeToUTCString(newTimeFilter.from),
      to: FilterUtils.convertTimeToUTCString(newTimeFilter.to),
      mode: newTimeFilter.mode,
    }));
  }

  /**
   * Changes made to app state outside of direct calls to this class will need to be propagated to the store.
   * @private
   */
  _pushAppStateChangesToStore() {
    // We need these checks, or you can get into a loop where a change is triggered by the store, which updates
    // AppState, which then dispatches the change here, which will end up triggering setState warnings.
    if (!this._areStoreAndAppStatePanelsEqual()) {
      // Translate appState panels data into the data expected by redux, copying the panel objects as we do so
      // because the panels inside appState can be mutated, while redux state should never be mutated directly.
      const panelsMap = this.getPanels().reduce((acc, panel) => {
        acc[panel.panelIndex] = _.cloneDeep(panel);
        return acc;
      }, {});
      store.dispatch(setPanels(panelsMap));
    }

    const state = store.getState();

    if (getTitle(state) !== this.getTitle()) {
      store.dispatch(updateTitle(this.getTitle()));
    }

    if (getDescription(state) !== this.getDescription()) {
      store.dispatch(updateDescription(this.getDescription()));
    }

    if (getViewMode(state) !== this.getViewMode()) {
      store.dispatch(updateViewMode(this.getViewMode()));
    }

    if (getUseMargins(state) !== this.getUseMargins()) {
      store.dispatch(updateUseMargins(this.getUseMargins()));
    }

    if (getHidePanelTitles(state) !== this.getHidePanelTitles()) {
      store.dispatch(updateHidePanelTitles(this.getHidePanelTitles()));
    }

    if (getFullScreenMode(state) !== this.getFullScreenMode()) {
      store.dispatch(updateIsFullScreenMode(this.getFullScreenMode()));
    }

    if (getTitle(state) !== this.getTitle()) {
      store.dispatch(updateTitle(this.getTitle()));
    }

    if (getDescription(state) !== this.getDescription()) {
      store.dispatch(updateDescription(this.getDescription()));
    }

    if (getQuery(state) !== this.getQuery()) {
      store.dispatch(updateQuery(this.getQuery()));
    }

    this._pushFiltersToStore();
  }

  _pushFiltersToStore() {
    const state = store.getState();
    const dashboardFilters = this.getDashboardFilterBars();
    if (!_.isEqual(
      FilterUtils.cleanFiltersForComparison(dashboardFilters),
      FilterUtils.cleanFiltersForComparison(getFilters(state))
    )) {
      store.dispatch(updateFilters(dashboardFilters));
    }
  }

  requestReload() {
    store.dispatch(requestReload());
  }

  _handleStoreChanges() {
    let dirty = false;
    if (!this._areStoreAndAppStatePanelsEqual()) {
      const panels = getPanels(store.getState());
      this.appState.panels = [];
      this.panelIndexPatternMapping = {};
      Object.values(panels).map(panel => {
        this.appState.panels.push(_.cloneDeep(panel));
      });
      dirty = true;
    }

    _.forEach(getEmbeddables(store.getState()), (embeddable, panelId) => {
      if (embeddable.initialized && !this.panelIndexPatternMapping.hasOwnProperty(panelId)) {
        const indexPattern = getEmbeddableMetadata(store.getState(), panelId).indexPattern;
        if (indexPattern) {
          this.panelIndexPatternMapping[panelId] = indexPattern;
          this.dirty = true;
        }
      }
    });

    const stagedFilters = getStagedFilters(store.getState());
    stagedFilters.forEach(filter => {
      this.addFilter(filter);
    });
    if (stagedFilters.length > 0) {
      this.saveState();
      store.dispatch(clearStagedFilters());
    }

    const fullScreen = getFullScreenMode(store.getState());
    if (fullScreen !== this.getFullScreenMode()) {
      this.setFullScreenMode(fullScreen);
    }

    this.changeListeners.forEach(listener => listener({ dirty }));
    this.saveState();
  }

  getFullScreenMode() {
    return this.appState.fullScreenMode;
  }

  setFullScreenMode(fullScreenMode) {
    this.appState.fullScreenMode = fullScreenMode;
    this.saveState();
  }

  getPanelIndexPatterns() {
    return _.uniq(Object.values(this.panelIndexPatternMapping));
  }

  /**
   * Resets the state back to the last saved version of the dashboard.
   */
  resetState() {
    // In order to show the correct warning for the saved-object-save-as-check-box we have to store the unsaved
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
   * @returns {{timeTo: String, timeFrom: String, filterBars: Array, query: Object}}
   */
  getFilterState() {
    return {
      timeTo: this.savedDashboard.timeTo,
      timeFrom: this.savedDashboard.timeFrom,
      filterBars: this.getDashboardFilterBars(),
      query: this.getDashboardQuery()
    };
  }

  getTitle() {
    return this.appState.title;
  }

  getDescription() {
    return this.appState.description;
  }

  setDescription(description) {
    this.appState.description = description;
    this.saveState();
  }

  setTitle(title) {
    this.appState.title = title;
    // The saved-object-save-as-check-box shows a warning if the current object title is different then
    // the existing object title. It calculates this difference by comparing this.dashboard.title to
    // this.dashboard.lastSavedTitle, so we need to push the temporary, unsaved title, onto the dashboard.
    this.savedDashboard.title = title;
    this.saveState();
  }

  getAppState() {
    return this.appState;
  }

  getQuery() {
    return this.appState.query;
  }

  getUseMargins() {
    // Existing dashboards that don't define this should default to false.
    return this.appState.options.useMargins === undefined ? false : this.appState.options.useMargins;
  }

  setUseMargins(useMargins) {
    this.appState.options.useMargins = useMargins;
    this.saveState();
  }

  getHidePanelTitles() {
    return this.appState.options.hidePanelTitles;
  }

  setHidePanelTitles(hidePanelTitles) {
    this.appState.options.hidePanelTitles = hidePanelTitles;
    this.saveState();
  }

  getDarkTheme() {
    return this.appState.options.darkTheme;
  }

  setDarkTheme(darkTheme) {
    this.appState.options.darkTheme = darkTheme;
    this.saveState();
  }

  getTimeRestore() {
    return this.appState.timeRestore;
  }

  setTimeRestore(timeRestore) {
    this.appState.timeRestore = timeRestore;
    this.saveState();
  }

  /**
   * @returns {boolean}
   */
  getIsTimeSavedWithDashboard() {
    return this.savedDashboard.timeRestore;
  }

  getDashboardFilterBars() {
    return FilterUtils.getFilterBarsForDashboard(this.savedDashboard);
  }

  getDashboardQuery() {
    return FilterUtils.getQueryFilterForDashboard(this.savedDashboard);
  }

  getLastSavedFilterBars() {
    return this.lastSavedDashboardFilters.filterBars;
  }

  getLastSavedQuery() {
    return this.lastSavedDashboardFilters.query;
  }

  /**
   * @returns {boolean} True if the query changed since the last time the dashboard was saved, or if it's a
   * new dashboard, if the query differs from the default.
   */
  getQueryChanged() {
    const currentQuery = this.appState.query;
    const lastSavedQuery = this.getLastSavedQuery();

    const isLegacyStringQuery = (
      _.isString(lastSavedQuery)
      && _.isPlainObject(currentQuery)
      && _.has(currentQuery, 'query')
    );
    if (isLegacyStringQuery) {
      return lastSavedQuery !== currentQuery.query;
    }

    return !_.isEqual(currentQuery, lastSavedQuery);
  }

  /**
   * @returns {boolean} True if the filter bar state has changed since the last time the dashboard was saved,
   * or if it's a new dashboard, if the query differs from the default.
   */
  getFilterBarChanged() {
    return !_.isEqual(
      FilterUtils.cleanFiltersForComparison(this.appState.filters),
      FilterUtils.cleanFiltersForComparison(this.getLastSavedFilterBars())
    );
  }

  /**
   * @param timeFilter
   * @returns {boolean} True if the time state has changed since the time saved with the dashboard.
   */
  getTimeChanged(timeFilter) {
    return (
      !FilterUtils.areTimesEqual(this.lastSavedDashboardFilters.timeFrom, timeFilter.getTime().from) ||
      !FilterUtils.areTimesEqual(this.lastSavedDashboardFilters.timeTo, timeFilter.getTime().to)
    );
  }

  /**
   *
   * @returns {DashboardViewMode}
   */
  getViewMode() {
    return this.hideWriteControls ? DashboardViewMode.VIEW : this.appState.viewMode;
  }

  /**
   * @returns {boolean}
   */
  getIsViewMode() {
    return this.getViewMode() === DashboardViewMode.VIEW;
  }

  /**
   * @returns {boolean}
   */
  getIsEditMode() {
    return this.getViewMode() === DashboardViewMode.EDIT;
  }

  /**
   *
   * @returns {boolean} True if the dashboard has changed since the last save (or, is new).
   */
  getIsDirty(timeFilter) {
    // Filter bar comparison is done manually (see cleanFiltersForComparison for the reason) and time picker
    // changes are not tracked by the state monitor.
    const hasTimeFilterChanged = timeFilter ? this.getFiltersChanged(timeFilter) : false;
    return this.getIsEditMode() && (this.isDirty || hasTimeFilterChanged);
  }

  getPanels() {
    return this.appState.panels;
  }

  updatePanel(panelIndex, panelAttributes) {
    const panel = this.getPanels().find((panel) => panel.panelIndex === panelIndex);
    Object.assign(panel, panelAttributes);
    this.saveState();
    return panel;
  }

  /**
   * Creates and initializes a basic panel, adding it to the state.
   * @param {number} id
   * @param {string} type
   */
  addNewPanel = (id, type) => {
    const maxPanelIndex = PanelUtils.getMaxPanelIndex(this.getPanels());
    const newPanel = createPanelState(id, type, maxPanelIndex, this.getPanels());
    this.getPanels().push(newPanel);
    this.saveState();
  }

  removePanel(panelIndex) {
    _.remove(this.getPanels(), (panel) => {
      if (panel.panelIndex === panelIndex) {
        delete this.panelIndexPatternMapping[panelIndex];
        return true;
      } else {
        return false;
      }
    });
    this.saveState();
  }

  /**
   * @param timeFilter
   * @returns {Array.<string>} An array of user friendly strings indicating the filter types that have changed.
   */
  getChangedFilterTypes(timeFilter) {
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
   * @return {boolean} True if filters (query, filter bar filters, and time picker if time is stored
   * with the dashboard) have changed since the last saved state (or if the dashboard hasn't been saved,
   * the default state).
   */
  getFiltersChanged(timeFilter) {
    return this.getChangedFilterTypes(timeFilter).length > 0;
  }

  /**
   * Updates timeFilter to match the time saved with the dashboard.
   * @param {Object} timeFilter
   * @param {func} timeFilter.setTime
   * @param {func} timeFilter.setRefreshInterval
   * @param quickTimeRanges
   */
  syncTimefilterWithDashboard(timeFilter, quickTimeRanges) {
    if (!this.getIsTimeSavedWithDashboard()) {
      throw new Error(i18n.translate('kbn.dashboard.stateManager.timeNotSavedWithDashboardErrorMessage', {
        defaultMessage: 'The time is not saved with this dashboard so should not be synced.',
      }));
    }

    let mode;
    const isMoment = moment(this.savedDashboard.timeTo).isValid();
    if (isMoment) {
      mode = 'absolute';
    } else {
      const quickTime = _.find(
        quickTimeRanges,
        (timeRange) => timeRange.from === this.savedDashboard.timeFrom && timeRange.to === this.savedDashboard.timeTo);

      mode = quickTime ? 'quick' : 'relative';
    }
    timeFilter.setTime({
      from: this.savedDashboard.timeFrom,
      to: this.savedDashboard.timeTo,
      mode
    });

    if (this.savedDashboard.refreshInterval) {
      timeFilter.setRefreshInterval(this.savedDashboard.refreshInterval);
    }
  }

  /**
   * Saves the current application state to the URL.
   */
  saveState() {
    this.appState.save();
  }

  /**
   * Applies the current filter state to the dashboard.
   * @param filter {Array.<Object>} An array of filter bar filters.
   */
  applyFilters(query, filters) {
    this.appState.query = query;
    this.savedDashboard.searchSource.setField('query', query);
    this.savedDashboard.searchSource.setField('filter', filters);
    this.saveState();
    // pinned filters go on global state, therefore are not propagated to store via app state and have to be pushed manually.
    this._pushFiltersToStore();
  }

  /**
   * Creates a state monitor and saves it to this.stateMonitor. Used to track unsaved changes made to appState.
   */
  createStateMonitor() {
    this.stateMonitor = stateMonitorFactory.create(this.appState, this.stateDefaults);

    this.stateMonitor.ignoreProps('viewMode');
    // Filters need to be compared manually because they sometimes have a $$hashkey stored on the object.
    this.stateMonitor.ignoreProps('filters');
    // Query needs to be compared manually because saved legacy queries get migrated in app state automatically
    this.stateMonitor.ignoreProps('query');

    this.stateMonitor.onChange(status => {
      this.isDirty = status.dirty;
    });
  }

  /**
   * @param newMode {DashboardViewMode}
   */
  switchViewMode(newMode) {
    this.appState.viewMode = newMode;
    this.saveState();
  }

  /**
   * Destroys and cleans up this object when it's no longer used.
   */
  destroy() {
    if (this.stateMonitor) {
      this.stateMonitor.destroy();
    }
    this.savedDashboard.destroy();
    this.unsubscribe();
  }
}
