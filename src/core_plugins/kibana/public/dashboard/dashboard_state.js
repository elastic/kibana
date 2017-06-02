import _ from 'lodash';
import { FilterUtils } from './filter_utils';

import { DashboardViewMode } from './dashboard_view_mode';
import { PanelUtils } from './panel/panel_utils';
import moment from 'moment';

import { stateMonitorFactory } from 'ui/state_management/state_monitor_factory';
import { createPanelState } from 'plugins/kibana/dashboard/panel/panel_state';
import { getPersistedStateId } from 'plugins/kibana/dashboard/panel/panel_state';

function getStateDefaults(dashboard) {
  return {
    title: dashboard.title,
    description: dashboard.description,
    timeRestore: dashboard.timeRestore,
    panels: dashboard.panelsJSON ? JSON.parse(dashboard.panelsJSON) : [],
    options: dashboard.optionsJSON ? JSON.parse(dashboard.optionsJSON) : {},
    uiState: dashboard.uiStateJSON ? JSON.parse(dashboard.uiStateJSON) : {},
    query: FilterUtils.getQueryFilterForDashboard(dashboard),
    filters: FilterUtils.getFilterBarsForDashboard(dashboard),
    viewMode: dashboard.id ? DashboardViewMode.VIEW : DashboardViewMode.EDIT,
  };
}

/**
 * Depending on how a dashboard is loaded, the filter object may contain a $$hashKey and $state that will throw
 * off a filter comparison. This removes those variables.
 * @param filters {Array.<Object>}
 * @returns {Array.<Object>}
 */
function cleanFiltersForComparison(filters) {
  return _.map(filters, (filter) => _.omit(filter, ['$$hashKey', '$state']));
}

/**
 * Converts the time to a string, if it isn't already.
 * @param time {string|Moment}
 * @returns {string}
 */
function convertTimeToString(time) {
  return typeof time === 'string' ? time : moment(time).toString();
}

/**
 * Compares the two times, making sure they are in both compared in string format. Absolute times
 * are sometimes stored as moment objects, but converted to strings when reloaded. Relative times are
 * strings that are not convertible to moment objects.
 * @param timeA {string|Moment}
 * @param timeB {string|Moment}
 * @returns {boolean}
 */
function areTimesEqual(timeA, timeB) {
  return convertTimeToString(timeA) === convertTimeToString(timeB);
}

export class DashboardState {
  /**
   *
   * @param savedDashboard {SavedDashboard}
   * @param AppState {AppState}
   */
  constructor(savedDashboard, AppState) {
    this.savedDashboard = savedDashboard;

    this.stateDefaults = getStateDefaults(this.savedDashboard);

    this.appState = new AppState(this.stateDefaults);
    this.uiState = this.appState.makeStateful('uiState');
    this.isDirty = false;

    // We can't compare the filters stored on this.appState to this.savedDashboard because in order to apply
    // the filters to the visualizations, we need to save it on the dashboard. We keep track of the original
    // filter state in order to let the user know if their filters changed and provide this specific information
    //in the 'lose changes' warning message.
    this.lastSavedDashboardFilters = this.getFilterState();

    // A mapping of panel index to the index pattern it uses.
    this.panelIndexPatternMapping = {};

    PanelUtils.initPanelIndexes(this.getPanels());
    this.createStateMonitor();
  }

  registerPanelIndexPatternMap(panelIndex, indexPattern) {
    this.panelIndexPatternMapping[panelIndex] = indexPattern;
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
    this.stateDefaults = getStateDefaults(this.savedDashboard);
    // The original query won't be restored by the above because the query on this.savedDashboard is applied
    // in place in order for it to affect the visualizations.
    this.stateDefaults.query = this.lastSavedDashboardFilters.query;
    // Need to make a copy to ensure they are not overwritten.
    this.stateDefaults.filters = Object.assign(new Array(), this.getLastSavedFilterBars());

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
    return !_.isEqual(this.appState.query, this.getLastSavedQuery());
  }

  /**
   * @returns {boolean} True if the filter bar state has changed since the last time the dashboard was saved,
   * or if it's a new dashboard, if the query differs from the default.
   */
  getFilterBarChanged() {
    return !_.isEqual(cleanFiltersForComparison(this.appState.filters),
      cleanFiltersForComparison(this.getLastSavedFilterBars()));
  }

  /**
   * @param timeFilter
   * @returns {boolean} True if the time state has changed since the time saved with the dashboard.
   */
  getTimeChanged(timeFilter) {
    return (
      !areTimesEqual(this.lastSavedDashboardFilters.timeFrom, timeFilter.time.from) ||
      !areTimesEqual(this.lastSavedDashboardFilters.timeTo, timeFilter.time.to)
    );
  }

  /**
   *
   * @returns {DashboardViewMode}
   */
  getViewMode() {
    return this.appState.viewMode;
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

  /**
   * Creates and initializes a basic panel, adding it to the state.
   * @param {number} id
   * @param {string} type
   */
  addNewPanel(id, type) {
    const maxPanelIndex = PanelUtils.getMaxPanelIndex(this.getPanels());
    this.getPanels().push(createPanelState(id, type, maxPanelIndex));
  }

  removePanel(panelIndex) {
    _.remove(this.getPanels(), (panel) => {
      if (panel.panelIndex === panelIndex) {
        this.uiState.removeChild(getPersistedStateId(panel));
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
   * Saves the dashboard.
   * @param toJson {function} A custom toJson function. Used because the previous code used
   * the angularized toJson version, and it was unclear whether there was a reason not to use
   * JSON.stringify
   * @param timefilter
   * @returns {Promise<string>} A promise that if resolved, will contain the id of the newly saved
   * dashboard.
   */
  saveDashboard(toJson, timeFilter) {
    this.saveState();

    const timeRestoreObj = _.pick(timeFilter.refreshInterval, ['display', 'pause', 'section', 'value']);
    this.savedDashboard.title = this.getTitle();
    this.savedDashboard.description = this.getDescription();
    this.savedDashboard.timeRestore = this.appState.timeRestore;
    this.savedDashboard.panelsJSON = toJson(this.appState.panels);
    this.savedDashboard.uiStateJSON = toJson(this.uiState.getChanges());
    this.savedDashboard.timeFrom = this.savedDashboard.timeRestore ? convertTimeToString(timeFilter.time.from) : undefined;
    this.savedDashboard.timeTo = this.savedDashboard.timeRestore ? convertTimeToString(timeFilter.time.to) : undefined;
    this.savedDashboard.refreshInterval = this.savedDashboard.timeRestore ? timeRestoreObj : undefined;
    this.savedDashboard.optionsJSON = toJson(this.appState.options);

    return this.savedDashboard.save()
      .then((id) => {
        this.lastSavedDashboardFilters = this.getFilterState();
        this.stateDefaults = getStateDefaults(this.savedDashboard);
        this.stateDefaults.viewMode = DashboardViewMode.VIEW;
        // Make sure new app state defaults are using the new defaults.
        this.appState.setDefaults(this.stateDefaults);
        this.stateMonitor.setInitialState(this.appState.toJSON());
        return id;
      });
  }

  /**
   * Applies the current filter state to the dashboard.
   * @param filter {Array.<Object>} An array of filter bar filters.
   */
  applyFilters(query, filters) {
    this.appState.query = query;
    if (this.appState.query) {
      this.savedDashboard.searchSource.set('filter', _.union(filters, [{
        query: this.appState.query
      }]));
    } else {
      this.savedDashboard.searchSource.set('filter', filters);
    }

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
  }
}
