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
} from '../common/types';

export { OPTIONS_LIST_CONTROL, CONTROL_GROUP_TYPE } from '../common';

export {
  ControlGroupContainer,
  ControlGroupContainerFactory,
  type ControlGroupInput,
  type ControlGroupOutput,
} from './control_group';

export {
  OptionsListEmbeddableFactory,
  OptionsListEmbeddable,
  type OptionsListEmbeddableInput,
} from './control_types';

export { LazyControlsCallout, type CalloutProps } from './controls_callout';

export function plugin() {
  return new ControlsPlugin();
}
