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
} from './react_controls/control_group/types';
export type {
  DataControlApi,
  DefaultDataControlState,
  DataControlFactory,
  DataControlServices,
} from './react_controls/controls/data_controls/types';
export { controlGroupStateBuilder } from './react_controls/control_group/control_group_state_builder';

/**
 * TODO: remove all exports below this when control group embeddable is removed
 */

export type {
  ControlOutput,
  ControlFactory,
  ControlEmbeddable,
  ControlEditorProps,
  CommonControlOutput,
  IEditableControlFactory,
  CanClearSelections,
} from './types';

export type {
  ControlWidth,
  ControlStyle,
  ParentIgnoreSettings,
  ControlInput,
  DataControlInput,
} from '../common/types';

export {
  CONTROL_GROUP_TYPE,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '../common';

export {
  type AddDataControlProps,
  type AddOptionsListControlProps,
  type AddRangeSliderControlProps,
  type ControlGroupContainer,
  ControlGroupContainerFactory,
  type ControlGroupInput,
  type ControlGroupInputBuilder,
  type ControlGroupAPI,
  type AwaitingControlGroupAPI,
  type ControlGroupOutput,
  controlGroupInputBuilder,
} from './control_group';

export {
  OptionsListEmbeddableFactory,
  type OptionsListEmbeddable,
  type OptionsListEmbeddableInput,
} from './options_list';

export {
  RangeSliderEmbeddableFactory,
  type RangeSliderEmbeddable,
  type RangeSliderEmbeddableInput,
} from './range_slider';

export {
  ACTION_EDIT_CONTROL,
  ACTION_DELETE_CONTROL,
  ControlGroupRenderer,
  type ControlGroupRendererProps,
} from './control_group';

/** TODO: Remove this once it is no longer needed in the examples plugin */
export { CONTROL_WIDTH_OPTIONS } from './control_group/editor/editor_constants';

export function plugin() {
  return new ControlsPlugin();
}
