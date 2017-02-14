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
    filters: FilterUtils.getFilterBarsForDashboard(dashboard)
  };
}

function cleanFiltersForComparison(filters) {
  return _.map(filters, (filter) => _.omit(filter, '$$hashKey'));
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
  constructor(dashboard, timefilter, timeFilterPreviouslyStored, defaultViewMode, quickTimeRanges, AppState) {
    this.stateDefaults = getStateDefaults(dashboard);
    this.stateDefaults.viewMode = defaultViewMode;

    this.appState = new AppState(this.stateDefaults);
    this.uiState = this.appState.makeStateful('uiState');
    this.isDirty = false;
    this.timefilter = timefilter;
    this.dashboard = dashboard;

    this.lastSavedDashboardFilters = this.getFilterState();

    // Unfortunately there is a hashkey stored with the filters on the appState, but not always
    // in the dashboard searchSource.  On a page refresh with a filter, this will cause the state
    // monitor to count them as different even if they aren't. Hence this is a bit of a hack to get around
    // that. TODO: Improve state monitor factory to take custom comparison functions for certain paths.
    if (!this.getFilterBarChanged()) {
      this.stateDefaults.filters = this.appState.filters;
    }

    if (this.getShouldSyncTimefilterWithDashboard() && timeFilterPreviouslyStored) {
      this.syncTimefilterWithDashboard(quickTimeRanges);
    }

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
   * Returns true if the timefilter should match the time stored with the dashboard.
   * @returns {boolean}
   */
  getShouldSyncTimefilterWithDashboard() {
    return this.dashboard.timeRestore && this.dashboard.timeTo && this.dashboard.timeFrom;
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

  getQueryChanged() {
    return !_.isEqual(this.appState.query, this.getLastSavedQuery());
  }

  getFilterBarChanged() {
    return !_.isEqual(cleanFiltersForComparison(this.appState.filters),
      cleanFiltersForComparison(this.getLastSavedFilterBars()));
  }

  getTimeChanged() {
    return (
      !areTimesEqual(this.lastSavedDashboardFilters.timeFrom, this.timefilter.time.from) ||
      !areTimesEqual(this.lastSavedDashboardFilters.timeTo, this.timefilter.time.to)
    );
  }

  getViewMode() {
    return this.appState.viewMode;
  }

  getIsDirty() {
    // Not all filter changes are tracked by the state monitor.
    return this.isDirty ||
      this.getFiltersChangedFromLastSave() ||
      this.dashboard.lastSavedTitle !== this.dashboard.title;
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
   * Updates the time filter to match the values stored in the dashboard.
   * @param {Array<Object>} quickTimeRanges - An array of often used default relative time ranges.
   * Used to determine whether a relative query should be classified as a "quick" time mode or
   * simply a "relative" time mode.
   */
  getFiltersChangedFromLastSave() {
    // If the dashboard hasn't been saved before, then there is no last saved state
    // for the current state to differ from.
    if (!this.dashboard.id) return false;

    return (
      this.getQueryChanged() ||
      this.getFilterBarChanged() ||
      (this.dashboard.timeRestore && this.getTimeChanged())
    );
  }

  getChangedFiltersForDisplay() {
    const changedFilters = [];
    if (this.getFilterBarChanged()) {
      changedFilters.push('filter');
    }
    if (this.getQueryChanged()) {
      changedFilters.push('query');
    }
    if (this.dashboard.timeRestore && this.getTimeChanged()) {
      changedFilters.push('time range');
    }
    return changedFilters;
  }

  syncTimefilterWithDashboard(quickTimeRanges) {
    this.timefilter.time.to = this.dashboard.timeTo;
    this.timefilter.time.from = this.dashboard.timeFrom;
    const isMoment = moment(this.dashboard.timeTo).isValid();
    if (isMoment) {
      this.timefilter.time.mode = 'absolute';
    } else {
      const quickTime = _.find(
        quickTimeRanges,
        (timeRange) => timeRange.from === this.dashboard.timeFrom && timeRange.to === this.dashboard.timeTo);

      this.timefilter.time.mode = quickTime ? 'quick' : 'relative';
    }
    if (this.dashboard.refreshInterval) {
      this.timefilter.refreshInterval = this.dashboard.refreshInterval;
    }
  }

  setQuery(newQuery) {
    this.appState.query = newQuery;
  }

  saveState() {
    this.appState.save();
  }


  /**
   * Saves the dashboard.
   * @param toJson {function} A custom toJson function. Used because the previous code used
   * the angularized toJson version, and it was unclear whether there was a reason not to use
   * JSON.stringify
   * @returns {Promise<string>} A promise that if resolved, will contain the id of the newly saved
   * dashboard.
   */
  saveDashboard(toJson) {
    this.saveState();

    const timeRestoreObj = _.pick(this.timefilter.refreshInterval, ['display', 'pause', 'section', 'value']);
    this.dashboard.title = this.appState.title;
    this.dashboard.timeRestore = this.appState.timeRestore;
    this.dashboard.panelsJSON = toJson(this.appState.panels);
    this.dashboard.uiStateJSON = toJson(this.uiState.getChanges());
    this.dashboard.timeFrom = this.dashboard.timeRestore ? convertTimeToString(this.timefilter.time.from) : undefined;
    this.dashboard.timeTo = this.dashboard.timeRestore ? convertTimeToString(this.timefilter.time.to) : undefined;
    this.dashboard.refreshInterval = this.dashboard.timeRestore ? timeRestoreObj : undefined;
    this.dashboard.optionsJSON = toJson(this.appState.options);

    return this.dashboard.save()
      .then((id) => {
        this.stateMonitor.setInitialState(this.appState.toJSON());
        this.lastSavedDashboardFilters = this.getFilterState();
        return id;
      });
  }

  /**
   * Stores the given filter with the dashboard and to the state.
   * @param filter
   */
  updateFilters(filter) {
    const filters = filter.getFilters();
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

  refreshStateMonitor() {
    if (this.stateMonitor) {
      this.stateMonitor.destroy();
    }
    this.createStateMonitor();
  }

  reloadLastSavedFilters() {
    // Need to make a copy to ensure nothing overwrites the originals.
    this.stateDefaults.filters = this.appState.filters = Object.assign(new Array(), this.getLastSavedFilterBars());
    this.stateDefaults.query = this.appState.query = Object.assign({}, this.getLastSavedQuery());

    if (this.dashboard.timeRestore) {
      this.timefilter.time.from = this.lastSavedDashboardFilters.timeFrom;
      this.timefilter.time.to = this.lastSavedDashboardFilters.timeTo;
    }

    this.refreshStateMonitor();
    this.isDirty = false;
    this.saveState();
  }
}
