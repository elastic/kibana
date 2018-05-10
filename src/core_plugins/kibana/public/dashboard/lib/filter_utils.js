import _ from 'lodash';
import moment from 'moment';

/**
 * @typedef {Object} QueryFilter
 * @property query_string {Object}
 * @property query_string.query {String}
 */

export class FilterUtils {
  /**
   *
   * @param filter
   * @returns {Boolean} True if the filter is of the special query type
   * (e.g. goes in the query input bar), false otherwise (e.g. is in the filter bar).
   */
  static isQueryFilter(filter) {
    return filter.query && !filter.meta;
  }

  /**
   *
   * @param {SavedDashboard} dashboard
   * @returns {Array.<Object>} An array of filters stored with the dashboard. Includes
   * both query filters and filter bar filters.
   */
  static getDashboardFilters(dashboard) {
    return dashboard.searchSource.getOwn('filter');
  }

  /**
   * Grabs a saved query to use from the dashboard, or if none exists, creates a default one.
   * @param {SavedDashboard} dashboard
   * @returns {QueryFilter}
   */
  static getQueryFilterForDashboard(dashboard) {
    if (dashboard.searchSource.getOwn('query')) {
      return dashboard.searchSource.getOwn('query');
    }

    const dashboardFilters = this.getDashboardFilters(dashboard);
    const dashboardQueryFilter = _.find(dashboardFilters, this.isQueryFilter);
    return dashboardQueryFilter ? dashboardQueryFilter.query : '';
  }

  /**
   * Returns the filters for the dashboard that should appear in the filter bar area.
   * @param {SavedDashboard} dashboard
   * @return {Array.<Object>} Array of filters that should appear in the filter bar for the
   * given dashboard
   */
  static getFilterBarsForDashboard(dashboard) {
    return _.reject(this.getDashboardFilters(dashboard), this.isQueryFilter);
  }

  /**
   * Converts the time to a utc formatted string. If the time is not valid (e.g. it might be in a relative format like
   * 'now-15m', then it just returns what it was passed).
   * @param time {string|Moment}
   * @returns {string} the time represented in utc format, or if the time range was not able to be parsed into a moment
   * object, it returns the same object it was given.
   */
  static convertTimeToUTCString(time) {
    if (moment(time).isValid()) {
      return moment(time).utc();
    }  else {
      return time;
    }
  }

  /**
   * Compares the two times, making sure they are in both compared in string format. Absolute times
   * are sometimes stored as moment objects, but converted to strings when reloaded. Relative times are
   * strings that are not convertible to moment objects.
   * @param timeA {string|Moment}
   * @param timeB {string|Moment}
   * @returns {boolean}
   */
  static areTimesEqual(timeA, timeB) {
    return this.convertTimeToUTCString(timeA) === this.convertTimeToUTCString(timeB);
  }

  /**
   * Depending on how a dashboard is loaded, the filter object may contain a $$hashKey and $state that will throw
   * off a filter comparison. This removes those variables.
   * @param filters {Array.<Object>}
   * @returns {Array.<Object>}
   */
  static cleanFiltersForComparison(filters) {
    return _.map(filters, (filter) => _.omit(filter, ['$$hashKey', '$state']));
  }
}
