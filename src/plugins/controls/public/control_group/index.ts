/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

export type { ControlGroupContainer } from './embeddable/control_group_container';
export type { ControlGroupInput, ControlGroupOutput } from './types';

export { CONTROL_GROUP_TYPE } from './types';
export { ControlGroupContainerFactory } from './embeddable/control_group_container_factory';

export {
  type AddDataControlProps,
  type AddOptionsListControlProps,
  controlGroupInputBuilder,
} from './control_group_input_builder';

export {
  type ControlGroupRendererProps,
  useControlGroupContainerContext,
} from './control_group_renderer';
export const LazyControlGroupRenderer = React.lazy(() => import('./control_group_renderer'));
