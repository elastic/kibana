/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlsPlugin } from './plugin';

export type {
  ControlOutput,
  ControlFactory,
  ControlEmbeddable,
  ControlEditorProps,
  CommonControlOutput,
  IEditableControlFactory,
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
  type ControlGroupContainer,
  ControlGroupContainerFactory,
  type ControlGroupInput,
  controlGroupInputBuilder,
  type ControlGroupOutput,
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
  LazyControlGroupRenderer,
  useControlGroupContainerContext,
  type ControlGroupRendererProps,
} from './control_group';

export function plugin() {
  return new ControlsPlugin();
}
