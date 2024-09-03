/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlsPlugin } from './plugin';

export { controlGroupStateBuilder } from './react_controls/control_group/control_group_state_builder';
export type {
  ControlGroupApi,
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
} from './react_controls/control_group/types';
export type {
  DataControlApi,
  DataControlFactory,
  DataControlServices,
  DefaultDataControlState,
} from './react_controls/controls/data_controls/types';

/**
 * TODO: remove all exports below this when control group embeddable is removed
 */

export type { CanClearSelections, ControlEditorProps } from './types';

export type {
  ControlInput,
  ControlStyle,
  ControlWidth,
  DataControlInput,
  ParentIgnoreSettings,
} from '../common/types';

export {
  CONTROL_GROUP_TYPE,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '../common';

export function plugin() {
  return new ControlsPlugin();
}
