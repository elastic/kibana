import _ from 'lodash';
import { getDefaultQuery } from 'ui/parse_query';

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
    const dashboardFilters = this.getDashboardFilters(dashboard);
    const dashboardQueryFilter = _.find(dashboardFilters, this.isQueryFilter);
    return dashboardQueryFilter ? dashboardQueryFilter.query : getDefaultQuery();
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
}
