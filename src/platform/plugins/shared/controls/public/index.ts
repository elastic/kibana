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

export {
  ControlGroupRenderer,
  type ControlGroupCreationOptions,
  type ControlGroupRendererApi,
  type ControlGroupRendererProps,
} from './control_group/control_group_renderer';

export {
  CONTROL_GROUP_TYPE,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
  ESQL_CONTROL,
} from '../common';
export type {
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
  ControlPanelState,
  ControlPanelsState,
  DefaultDataControlState,
} from '../common';
export type { OptionsListControlState } from '../common/options_list';

export function plugin() {
  return new ControlsPlugin();
}
