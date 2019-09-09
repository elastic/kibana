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

import { get } from 'lodash';
import { RESTRICTIONS_KEYS, DEFAULT_UI_RESTRICTION } from '../../common/ui_restrictions';

/**
 * Generic method for checking all types of the UI Restrictions
 * @private
 */
const checkUIRestrictions = (key, restrictions = DEFAULT_UI_RESTRICTION, type) => {
  const isAllEnabled = get(restrictions, `${type}.*`, true);

  return isAllEnabled || Boolean(get(restrictions, type, {})[key]);
};

/**
 * Using this method, you can check whether a specific Metric (Aggregation) is allowed
 *  for current panel configuration or not.
 * @public
 * @param key - string value of Metric (Aggregation).
 * @param restrictions - uiRestrictions object. Comes from the /data request.
 * @return {boolean}
 */
export const isMetricEnabled = (key, restrictions) => {
  return checkUIRestrictions(key, restrictions, RESTRICTIONS_KEYS.WHITE_LISTED_METRICS);
};

/**
 * Using this method, you can check whether a specific Field is allowed
 *  for Metric (aggregation) or not.
 * @public
 * @param field - string value of data Field.
 * @param metricType - string value of Metric (Aggregation).
 * @param restrictions - uiRestrictions object. Comes from the /data request.
 * @return {boolean}
 */
export const isFieldEnabled = (field, metricType, restrictions = DEFAULT_UI_RESTRICTION) => {
  if (isMetricEnabled(metricType, restrictions)) {
    return checkUIRestrictions(
      field,
      restrictions[RESTRICTIONS_KEYS.WHITE_LISTED_METRICS],
      metricType
    );
  }
  return false;
};

/**
 * Using this method, you can check whether a specific Group By mode is allowed
 *  for current panel configuration or not.
 * @public
 * @param key - string value of Group by mode.
 *  All available mode you can find in the following object SPLIT_MODES.
 * @param restrictions - uiRestrictions object. Comes from the /data request.
 * @return {boolean}
 */
export const isGroupByFieldsEnabled = (key, restrictions) => {
  return checkUIRestrictions(key, restrictions, RESTRICTIONS_KEYS.WHITE_LISTED_GROUP_BY_FIELDS);
};

/**
 * Using this method, you can check whether a specific time range is allowed
 *  for current panel configuration or not.
 * @public
 * @param key - string value of the time range mode.
 *  All available mode you can find in the following object TIME_RANGE_DATA_MODES.
 * @param restrictions - uiRestrictions object. Comes from the /data request.
 * @return {boolean}
 */
export const isTimerangeModeEnabled = (key, restrictions) => {
  return checkUIRestrictions(key, restrictions, RESTRICTIONS_KEYS.WHITE_LISTED_TIMERANGE_MODES);
};
