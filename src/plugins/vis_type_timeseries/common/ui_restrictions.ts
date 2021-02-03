/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PANEL_TYPES } from './panel_types';

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

/** limit on the number of series for the panel
 * @constant
 * @public
 */
export const limitOfSeries: Partial<Record<PANEL_TYPES, number>> = {
  [PANEL_TYPES.GAUGE]: 1,
  [PANEL_TYPES.METRIC]: 2,
};
