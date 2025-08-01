/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlsPlugin } from './plugin';

export {
  controlGroupStateBuilder,
  type ControlGroupStateBuilder,
} from './control_group/utils/control_group_state_builder';

export {
  ACTION_CLEAR_CONTROL,
  ACTION_DELETE_CONTROL,
  ACTION_EDIT_CONTROL,
} from './actions/constants';

export type { ControlGroupApi, ControlStateTransform } from './control_group/types';
export type { DataControlApi, DataControlFactory } from './controls/data_controls/types';
export type { DefaultControlApi } from './controls/types';
export type { OptionsListControlApi } from './controls/data_controls/options_list_control/types';
export type { RangesliderControlApi } from './controls/data_controls/range_slider/types';
export type { ESQLControlApi } from './controls/esql_control/types';
export type { TimesliderControlApi } from './controls/timeslider_control/types';

export {
  ControlGroupRenderer,
  type ControlGroupCreationOptions,
  type ControlGroupRendererApi,
  type ControlGroupRendererProps,
} from './control_group/control_group_renderer';

export type {
  ControlGroupRuntimeState,
  ControlPanelState,
  ControlPanelsState,
  DefaultDataControlState,
} from '../common';
export type { OptionsListControlState } from '../common/options_list';

export { serializeRuntimeState } from './control_group/utils/serialize_runtime_state';

export function plugin() {
  return new ControlsPlugin();
}
