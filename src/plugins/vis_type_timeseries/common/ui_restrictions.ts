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

/**
 * UI Restrictions keys
 * @constant
 * @public
 */
export enum RESTRICTIONS_KEYS {
  /**
   * Key for getting the white listed group by fields from the UIRestrictions object.
   */
  WHITE_LISTED_GROUP_BY_FIELDS = 'whiteListedGroupByFields',

  /**
   * Key for getting the white listed metrics from the UIRestrictions object.
   */
  WHITE_LISTED_METRICS = 'whiteListedMetrics',

  /**
   * Key for getting  the white listed Time Range modes from the UIRestrictions object.
   */
  WHITE_LISTED_TIMERANGE_MODES = 'whiteListedTimerangeModes',
}

export interface UIRestrictions {
  '*': boolean;
  [restriction: string]: boolean;
}

export type TimeseriesUIRestrictions = {
  [key in RESTRICTIONS_KEYS]: Record<string, UIRestrictions>;
};

/**
 * Default value for the UIRestriction
 * @constant
 * @public
 */
export const DEFAULT_UI_RESTRICTION: UIRestrictions = {
  '*': true,
};
