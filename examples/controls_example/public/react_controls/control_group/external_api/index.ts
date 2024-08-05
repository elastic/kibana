/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { ControlGroupRenderer } from './control_group_renderer';

/** Renaming exports to keep types published from the control plugin consistent */
export type {
  AwaitingControlGroupApi as AwaitingControlGroupAPI,
  ControlGroupRendererState as ControlGroupInput,
} from './types';

export { controlGroupInputBuilder } from './control_group_input_builder';
