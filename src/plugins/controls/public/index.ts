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
} from './react_controls/control_group/utils/control_group_state_builder';

export type { ControlGroupApi, ControlStateTransform } from './react_controls/control_group/types';

export { ACTION_CLEAR_CONTROL, ACTION_DELETE_CONTROL, ACTION_EDIT_CONTROL } from './actions';

export type {
  DataControlApi,
  DataControlFactory,
  DataControlServices,
} from './react_controls/controls/data_controls/types';

export {
  ControlGroupRenderer,
  type ControlGroupCreationOptions,
  type ControlGroupRendererApi,
  type ControlGroupRendererProps,
} from './react_controls/external_api';

export {
  CONTROL_GROUP_TYPE,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '../common';
export type {
  ControlGroupRuntimeState,
  ControlPanelState,
  ControlPanelsState,
  DefaultDataControlState,
} from '../common';
export type { OptionsListControlState } from '../common/options_list';

export function plugin() {
  return new ControlsPlugin();
}
