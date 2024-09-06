/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type {
  ControlStyle,
  ControlWidth,
  DefaultControlState,
  DefaultDataControlState,
  ParentIgnoreSettings,
  SerializedControlState,
} from './types';

export const TIME_SLIDER_CONTROL = 'timeSlider';
export const RANGE_SLIDER_CONTROL = 'rangeSliderControl';
export const OPTIONS_LIST_CONTROL = 'optionsListControl';

export {
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_STYLE,
  DEFAULT_CONTROL_WIDTH,
} from './control_group/control_group_constants';
export { CONTROL_GROUP_TYPE } from './control_group/types';
export type {
  ControlGroupChainingSystem,
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
  ControlPanelState,
  ControlPanelsState,
} from './control_group/types';
