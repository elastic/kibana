/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { RESTRICTIONS_KEYS, DEFAULT_UI_RESTRICTION } from '../../../common/ui_restrictions';

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
