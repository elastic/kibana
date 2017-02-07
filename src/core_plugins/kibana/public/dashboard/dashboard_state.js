import _ from 'lodash';
import { FilterUtils } from './filter_utils';
import { PanelUtils } from './panel/panel_utils';
import moment from 'moment';

import stateMonitorFactory  from 'ui/state_management/state_monitor_factory';
import { createPanelState } from 'plugins/kibana/dashboard/panel/panel_state';
import { getPersistedStateId } from 'plugins/kibana/dashboard/panel/panel_state';

function getStateDefaults(dashboard) {
  return {
    title: dashboard.title,
    panels: dashboard.panelsJSON ? JSON.parse(dashboard.panelsJSON) : [],
    options: dashboard.optionsJSON ? JSON.parse(dashboard.optionsJSON) : {},
    uiState: dashboard.uiStateJSON ? JSON.parse(dashboard.uiStateJSON) : {},
    query: FilterUtils.getQueryFilterForDashboard(dashboard),
    filters: FilterUtils.getFilterBarsForDashboard(dashboard)
  };
}

export class DashboardState {
  /**
   * @param dashboard {SavedDashboard}
   * @param timefilter {Object}
   * @param timeFilterPreviouslyStored {boolean} - I'm honestly not sure what this value
   * means but preserving original logic after a refactor.
   * @param quickTimeRanges {Array<Object>} An array of default time ranges that should be
   * classified as 'quick' mode.
   * @param AppState {Object} A class that will be used to instantiate the appState.
   */
  constructor(dashboard, timefilter, timeFilterPreviouslyStored, quickTimeRanges, AppState) {
    this.stateDefaults = getStateDefaults(dashboard);

    this.appState = new AppState(this.stateDefaults);
    this.uiState = this.appState.makeStateful('uiState');
    this.timefilter = timefilter;
    this.dashboard = dashboard;

    this.stateMonitor = stateMonitorFactory.create(this.appState, this.stateDefaults);

    if (this.getShouldSyncTimefilterWithDashboard() && timeFilterPreviouslyStored) {
      this.syncTimefilterWithDashboard(quickTimeRanges);
    }

    PanelUtils.initPanelIndexes(this.getPanels());
  }

  getAppState() {
    return this.appState;
  }

  getQuery() {
    return this.appState.query;
  }

  getOptions() {
    return this.appState.options;
  }

  /**
   * Returns true if the timefilter should match the time stored with the dashboard.
   * @returns {boolean}
   */
  getShouldSyncTimefilterWithDashboard() {
    return this.dashboard.timeRestore && this.dashboard.timeTo && this.dashboard.timeFrom;
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
    this.dashboard.panelsJSON = toJson(this.appState.panels);
    this.dashboard.uiStateJSON = toJson(this.uiState.getChanges());
    this.dashboard.timeFrom = this.dashboard.timeRestore ? this.timefilter.time.from : undefined;
    this.dashboard.timeTo = this.dashboard.timeRestore ? this.timefilter.time.to : undefined;
    this.dashboard.refreshInterval = this.dashboard.timeRestore ? timeRestoreObj : undefined;
    this.dashboard.optionsJSON = toJson(this.appState.options);

    return this.dashboard.save()
      .then((id) => {
        this.stateMonitor.setInitialState(this.appState.toJSON());
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

  destroy() {
    if (this.stateMonitor) {
      this.stateMonitor.destroy();
    }
    this.dashboard.destroy();
  }
}
