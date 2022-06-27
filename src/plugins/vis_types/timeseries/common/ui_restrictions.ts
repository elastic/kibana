/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PANEL_TYPES } from './enums';

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
   * Key for getting the white listed Time Range modes from the UIRestrictions object.
   */
  WHITE_LISTED_TIMERANGE_MODES = 'whiteListedTimerangeModes',

  /**
   * Key for getting the white listed Configuration Features from the UIRestrictions object.
   */
  WHITE_LISTED_CONFIGURATION_FEATURES = 'whiteListedConfigurationFeatures',
}

export interface UIRestrictions {
  '*': boolean;
  [key: string]: boolean | UIRestrictions;
}

export interface TimeseriesUIRestrictions extends UIRestrictions {
  [RESTRICTIONS_KEYS.WHITE_LISTED_GROUP_BY_FIELDS]: UIRestrictions;
  [RESTRICTIONS_KEYS.WHITE_LISTED_METRICS]: UIRestrictions;
  [RESTRICTIONS_KEYS.WHITE_LISTED_TIMERANGE_MODES]: UIRestrictions;
  [RESTRICTIONS_KEYS.WHITE_LISTED_CONFIGURATION_FEATURES]: UIRestrictions;
}

/**
 * Default value for the UIRestriction
 * @constant
 * @public
 */
export const DEFAULT_UI_RESTRICTION: UIRestrictions = {
  '*': true,
};

/** limit on the number of series for the panel
 * @constant
 * @public
 */
export const limitOfSeries: Partial<Record<PANEL_TYPES, number>> = {
  [PANEL_TYPES.GAUGE]: 1,
  [PANEL_TYPES.METRIC]: 2,
};
