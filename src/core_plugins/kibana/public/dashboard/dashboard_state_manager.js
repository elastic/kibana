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
} from '../selectors';

/**
 * Dashboard state manager handles connecting angular and redux state between the angular and react portions of the
 * app. There are two "sources of truth" that need to stay in sync - AppState and the Store. They aren't complete
 * duplicates of each other as AppState has state that the Store doesn't, and vice versa.
 *
 * State that is only stored in AppState:
 *  - title
 *  - description
 *  - timeRestore
 *  - query
 *  - filters
 *
 * State that is only stored in the Store:
 *  - embeddables
 *  - maximizedPanelId
 *
 * State that is shared and needs to be synced:
 * - fullScreenMode - changes propagate from AppState -> Store and from Store -> AppState.
 * - viewMode - changes only propagate from AppState -> Store
 * - panels - changes propagate from AppState -> Store and from Store -> AppState.
 *
 *
 */
export class DashboardStateManager {
  /**
   *
   * @param savedDashboard {SavedDashboard}
   * @param AppState {AppState} The AppState class to use when instantiating a new AppState instance.
   * @param hideWriteControls {boolean} true if write controls should be hidden.
   */
  constructor(savedDashboard, AppState, hideWriteControls) {
    this.savedDashboard = savedDashboard;
    this.hideWriteControls = hideWriteControls;

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

    // Always start out with all panels minimized when a dashboard is first loaded.
    store.dispatch(minimizePanel());
    store.dispatch(setPanels({}));
    this.embeddableConfigChangeListeners = {};
    this._pushAppStateChangesToStore();

    this.changeListeners = [];

    this.unsubscribe = store.subscribe(() => this._handleStoreChanges());
    this.stateMonitor.onChange(status => {
      this.changeListeners.forEach(listener => listener(status));
      this._pushAppStateChangesToStore();
    });
  }

  registerEmbeddableConfigChangeListener(panelIndex, callback) {
    let panelListeners = this.embeddableConfigChangeListeners[panelIndex];
    if (!panelListeners) {
      panelListeners = this.embeddableConfigChangeListeners[panelIndex] = [];
    }
    panelListeners.push(callback);
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
   * For each embeddable config in appState that differs from that in the redux store, trigger the change listeners
   * using the appState version as the "source of truth". This is because currently the only way to update an embeddable
   * config from the dashboard side is via the url. Eventually we want to let users modify it via a "reset link" in
   * the panel config, or even a way to modify it in the panel config. When this is introduced it would go through
   * redux and we'd have to update appState. At that point, we'll need to handle changes coming from both directions.
   * Ideally we can introduce react-redux-router for a more seamless way to keep url changes and ui changes in sync.
   * ... until then... we are stuck with this manual crap. :(
   * Fixes https://github.com/elastic/kibana/issues/15720
   */
  triggerEmbeddableConfigUpdateListeners() {
    const state = store.getState();
    for(const appStatePanel of this.appState.panels) {
      const storePanel = getPanel(state, appStatePanel.panelIndex);
      if (storePanel && !_.isEqual(appStatePanel.embeddableConfig, storePanel.embeddableConfig)) {
        const panelListeners = this.embeddableConfigChangeListeners[appStatePanel.panelIndex];
        if (panelListeners) {
          panelListeners.forEach(listener => listener(appStatePanel.embeddableConfig));
        }
      }
    }
  }

  /**
   * Changes made to app state outside of direct calls to this class will need to be propagated to the store.
   * @private
   */
  _pushAppStateChangesToStore() {
    // We need these checks, or you can get into a loop where a change is triggered by the store, which updates
    // AppState, which then dispatches the change here, which will end up triggering setState warnings.
    if (!this._areStoreAndAppStatePanelsEqual()) {
      this.triggerEmbeddableConfigUpdateListeners();

      // Translate appState panels data into the data expected by redux, copying the panel objects as we do so
      // because the panels inside appState can be mutated, while redux state should never be mutated directly.
      const panelsMap = this.getPanels().reduce((acc, panel) => {
        acc[panel.panelIndex] = { ...panel };
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
  }

  _handleStoreChanges() {
    let dirty = false;
    if (!this._areStoreAndAppStatePanelsEqual()) {
      const panels = getPanels(store.getState());
      this.appState.panels = [];
      Object.values(panels).map(panel => {
        this.appState.panels.push({ ...panel });
      });
      dirty = true;
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

  registerPanelIndexPatternMap(panelIndex, indexPattern) {
    if (indexPattern) {
      this.panelIndexPatternMapping[panelIndex] = indexPattern;
    }
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
      !FilterUtils.areTimesEqual(this.lastSavedDashboardFilters.timeFrom, timeFilter.time.from) ||
      !FilterUtils.areTimesEqual(this.lastSavedDashboardFilters.timeTo, timeFilter.time.to)
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
    return this.isDirty ||
      // Filter bar comparison is done manually (see cleanFiltersForComparison for the reason) and time picker
      // changes are not tracked by the state monitor.
      this.getFiltersChanged(timeFilter);
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
  addNewPanel(id, type) {
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
   * @param timeFilter
   * @param quickTimeRanges
   */
  syncTimefilterWithDashboard(timeFilter, quickTimeRanges) {
    if (!this.getIsTimeSavedWithDashboard()) {
      throw new Error('The time is not saved with this dashboard so should not be synced.');
    }

    timeFilter.time.to = this.savedDashboard.timeTo;
    timeFilter.time.from = this.savedDashboard.timeFrom;
    const isMoment = moment(this.savedDashboard.timeTo).isValid();
    if (isMoment) {
      timeFilter.time.mode = 'absolute';
    } else {
      const quickTime = _.find(
        quickTimeRanges,
        (timeRange) => timeRange.from === this.savedDashboard.timeFrom && timeRange.to === this.savedDashboard.timeTo);

      timeFilter.time.mode = quickTime ? 'quick' : 'relative';
    }
    if (this.savedDashboard.refreshInterval) {
      timeFilter.refreshInterval = this.savedDashboard.refreshInterval;
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
    this.savedDashboard.searchSource.set('query', query);
    this.savedDashboard.searchSource.set('filter', filters);
    this.saveState();
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
