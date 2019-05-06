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

import _ from 'lodash';
import moment, { Moment } from 'moment';
import { Filter } from 'plugins/embeddable_api/index';
import { SavedObjectDashboard } from '../saved_dashboard/saved_dashboard';

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
  public static isQueryFilter(filter: Filter) {
    return filter.query && !filter.meta;
  }

  /**
   *
   * @param {SavedDashboard} dashboard
   * @returns {Array.<Object>} An array of filters stored with the dashboard. Includes
   * both query filters and filter bar filters.
   */
  public static getDashboardFilters(dashboard: SavedObjectDashboard) {
    return dashboard.searchSource.getOwnField('filter');
  }

  /**
   * Grabs a saved query to use from the dashboard, or if none exists, creates a default one.
   * @param {SavedDashboard} dashboard
   * @returns {QueryFilter}
   */
  public static getQueryFilterForDashboard(dashboard: SavedObjectDashboard) {
    if (dashboard.searchSource.getOwnField('query')) {
      return dashboard.searchSource.getOwnField('query');
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
  public static getFilterBarsForDashboard(dashboard: SavedObjectDashboard) {
    return _.reject(this.getDashboardFilters(dashboard), this.isQueryFilter);
  }

  /**
   * Converts the time to a utc formatted string. If the time is not valid (e.g. it might be in a relative format like
   * 'now-15m', then it just returns what it was passed).
   * @param time {string|Moment}
   * @returns {string} the time represented in utc format, or if the time range was not able to be parsed into a moment
   * object, it returns the same object it was given.
   */
  public static convertTimeToUTCString(time: string | Moment): string {
    if (moment(time).isValid()) {
      return moment(time)
        .utc()
        .toString();
    } else {
      return time.toString();
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
  public static areTimesEqual(timeA: string | Moment, timeB: string | Moment) {
    return this.convertTimeToUTCString(timeA) === this.convertTimeToUTCString(timeB);
  }

  /**
   * Depending on how a dashboard is loaded, the filter object may contain a $$hashKey and $state that will throw
   * off a filter comparison. This removes those variables.
   * @param filters {Array.<Object>}
   * @returns {Array.<Object>}
   */
  public static cleanFiltersForComparison(filters: Filter[]) {
    return _.map(filters, filter => _.omit(filter, ['$$hashKey', '$state']));
  }
}
