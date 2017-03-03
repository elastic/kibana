import _ from 'lodash';
import { FilterUtils } from './filter_utils';

import { DashboardConstants } from './dashboard_constants';
import { DashboardViewMode } from './dashboard_view_mode';
import { PanelUtils } from './panel/panel_utils';
import moment from 'moment';

import stateMonitorFactory  from 'ui/state_management/state_monitor_factory';
import { createPanelState } from 'plugins/kibana/dashboard/panel/panel_state';
import { getPersistedStateId } from 'plugins/kibana/dashboard/panel/panel_state';

function getStateDefaults(dashboard) {
  return {
    title: dashboard.title,
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
  constructor(dashboard, AppState) {
    this.dashboard = dashboard;

    this.stateDefaults = getStateDefaults(this.dashboard);

    this.appState = new AppState(this.stateDefaults);
    this.uiState = this.appState.makeStateful('uiState');
    this.isDirty = false;

    // We can't compare the filters stored on this.appState to this.dashboard because in order to apply
    // the filters to the visualizations, we need to save it on the dashboard. We keep track of the original
    // filter state in order to let the user know if their filters changed and provide this specific information
    //in the 'lose changes' warning message.
    this.lastSavedDashboardFilters = this.getFilterState();

    PanelUtils.initPanelIndexes(this.getPanels());
    this.createStateMonitor();
  }

  resetState() {
    this.appState.reset();
  }

  getFilterState() {
    return {
      timeTo: this.dashboard.timeTo,
      timeFrom: this.dashboard.timeFrom,
      filterBars: this.getDashboardFilterBars(),
      query: this.getDashboardQuery()
    };
  }

  getTitle() {
    return this.appState.title;
  }

  setTitle(title) {
    this.appState.title = title;
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
    return this.dashboard.timeRestore;
  }

  getDashboardFilterBars() {
    return FilterUtils.getFilterBarsForDashboard(this.dashboard);
  }

  getDashboardQuery() {
    return FilterUtils.getQueryFilterForDashboard(this.dashboard);
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

  getFilterBarChanged() {
    return !_.isEqual(cleanFiltersForComparison(this.appState.filters),
      cleanFiltersForComparison(this.getLastSavedFilterBars()));
  }

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
        return true;
      } else {
        return false;
      }
    });
    this.saveState();
  }

  /**
   * @return {boolean} True if filters (query, filter bar filters, and time picker if time is stored
   * with the dashboard) have changed since the last saved state (or if the dashboard hasn't been saved,
   * the default state).
   */
  getFiltersChanged(timeFilter) {
    return (
      this.getQueryChanged() ||
      this.getFilterBarChanged() ||
      (this.dashboard.timeRestore && this.getTimeChanged(timeFilter))
    );
  }

  getChangedFiltersForDisplay(timeFilter) {
    const changedFilters = [];
    if (this.getFilterBarChanged()) {
      changedFilters.push('filter');
    }
    if (this.getQueryChanged()) {
      changedFilters.push('query');
    }
    if (this.dashboard.timeRestore && this.getTimeChanged(timeFilter)) {
      changedFilters.push('time range');
    }
    return changedFilters;
  }

  syncTimefilterWithDashboard(timeFilter, quickTimeRanges) {
    timeFilter.time.to = this.dashboard.timeTo;
    timeFilter.time.from = this.dashboard.timeFrom;
    const isMoment = moment(this.dashboard.timeTo).isValid();
    if (isMoment) {
      timeFilter.time.mode = 'absolute';
    } else {
      const quickTime = _.find(
        quickTimeRanges,
        (timeRange) => timeRange.from === this.dashboard.timeFrom && timeRange.to === this.dashboard.timeTo);

      timeFilter.time.mode = quickTime ? 'quick' : 'relative';
    }
    if (this.dashboard.refreshInterval) {
      timeFilter.refreshInterval = this.dashboard.refreshInterval;
    }
  }

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
    this.dashboard.title = this.appState.title;
    this.dashboard.timeRestore = this.appState.timeRestore;
    this.dashboard.panelsJSON = toJson(this.appState.panels);
    this.dashboard.uiStateJSON = toJson(this.uiState.getChanges());
    this.dashboard.timeFrom = this.dashboard.timeRestore ? convertTimeToString(timeFilter.time.from) : undefined;
    this.dashboard.timeTo = this.dashboard.timeRestore ? convertTimeToString(timeFilter.time.to) : undefined;
    this.dashboard.refreshInterval = this.dashboard.timeRestore ? timeRestoreObj : undefined;
    this.dashboard.optionsJSON = toJson(this.appState.options);

    return this.dashboard.save()
      .then((id) => {
        this.stateMonitor.setInitialState(this.appState.toJSON());
        this.lastSavedDashboardFilters = this.getFilterState();
        this.stateDefaults = getStateDefaults(this.dashboard);
        this.stateDefaults.viewMode = DashboardViewMode.VIEW;
        // Make sure new app state defaults are using the new defaults.
        this.appState.setDefaults(this.stateDefaults);
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
      this.dashboard.searchSource.set('filter', _.union(filters, [{
        query: this.appState.query
      }]));
    } else {
      this.dashboard.searchSource.set('filter', filters);
    }

    this.saveState();
  }

  createStateMonitor() {
    this.stateMonitor = stateMonitorFactory.create(this.appState, this.stateDefaults);

    this.stateMonitor.ignoreProps('viewMode');
    // Filters need to be compared manually because they sometimes have a $$hashkey stored on the object.
    this.stateMonitor.ignoreProps('filters');

    this.stateMonitor.onChange(status => {
      this.isDirty = status.dirty;
    });
  }

  switchViewMode(newMode) {
    this.appState.viewMode = newMode;
    this.saveState();
  }

  destroy() {
    if (this.stateMonitor) {
      this.stateMonitor.destroy();
    }
    this.dashboard.destroy();
  }

  getReloadDashboardUrl() {
    const url = this.dashboard.id ?
      DashboardConstants.EXISTING_DASHBOARD_URL : DashboardConstants.CREATE_NEW_DASHBOARD_URL;
    const options = this.dashboard.id ? { id: this.dashboard.id } : {};
    return { url, options };
  }
}
