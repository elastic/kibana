/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlsPlugin } from './plugin';

export type {
  ControlGroupApi,
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
  ControlStateTransform,
  ControlPanelState,
} from './react_controls/control_group/types';
export {
  controlGroupStateBuilder,
  type ControlGroupStateBuilder,
} from './react_controls/control_group/utils/control_group_state_builder';

export type {
  DataControlApi,
  DefaultDataControlState,
  DataControlFactory,
  DataControlServices,
} from './react_controls/controls/data_controls/types';
export type { OptionsListControlState } from './react_controls/controls/data_controls/options_list_control/types';

export { ACTION_EDIT_CONTROL } from './react_controls/actions/edit_control_action/edit_control_action';

export {
  ACTION_DELETE_CONTROL,
  ControlGroupRenderer,
  type ControlGroupRendererProps,
  type ControlGroupRendererApi,
  type ControlGroupCreationOptions,
} from './control_group';

export type { ControlWidth, ControlStyle } from '../common/types';

/**
 * TODO: remove all exports below this when control group embeddable is removed
 */

export {
  CONTROL_GROUP_TYPE,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '../common';

export {
  type ControlGroupContainer,
  ControlGroupContainerFactory,
  type ControlGroupInput,
  type ControlGroupOutput,
  controlGroupInputBuilder,
} from './control_group';

export function plugin() {
  return new ControlsPlugin();
}
