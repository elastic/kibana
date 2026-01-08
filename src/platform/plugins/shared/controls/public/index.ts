/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlsPlugin } from './plugin';

export type { DataControlApi } from './controls/data_controls/types';
export type { OptionsListControlApi } from './controls/data_controls/options_list_control/types';
export type { RangeSliderControlApi } from './controls/data_controls/range_slider/types';
export type { ESQLControlApi } from './controls/esql_control/types';
export type { TimeSliderControlApi } from './controls/timeslider_control/types';

export function plugin() {
  return new ControlsPlugin();
}
