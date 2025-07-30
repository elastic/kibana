/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import {
  chainingSchema,
  controlsGroupSchema,
  labelPositionSchema,
  ignoreParentSettingsSchema,
} from './controls_group_schema';
import { controlWidthSchema } from './control_schema';
import { esqlControlState } from './esql_control';
import { optionsListControlState } from './options_list_control';
import { rangeSliderControlState, rangeValue } from './range_slider_control';
import { timeSliderControlState } from './time_slider_control';

export type ControlsGroupState = TypeOf<typeof controlsGroupSchema>;

export type ControlsLabelPosition = TypeOf<typeof labelPositionSchema>;
export type ControlsChainingSystem = TypeOf<typeof chainingSchema>;
export type ControlsIgnoreParentSettings = TypeOf<typeof ignoreParentSettingsSchema>;

export type ControlWidth = TypeOf<typeof controlWidthSchema>;

export type ESQLControlState = TypeOf<typeof esqlControlState>;

/**
 * Display settings for the options list control are only used in the UI
 * and are not serialized in the control state.
 */
export interface OptionsListDisplaySettings {
  placeholder?: string;
  hideActionBar?: boolean;
  hideExclude?: boolean;
  hideExists?: boolean;
  hideSort?: boolean;
}
export type OptionsListControlState = TypeOf<typeof optionsListControlState> &
  OptionsListDisplaySettings;

export type RangeValue = TypeOf<typeof rangeValue>;
export type RangeSliderControlState = TypeOf<typeof rangeSliderControlState>;

export type TimeSliderControlState = TypeOf<typeof timeSliderControlState>;
