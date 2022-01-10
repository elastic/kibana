/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableInput, PanelState } from '../../../embeddable/common/types';
import { ControlInput, ControlStyle, ControlWidth } from '../types';

export const CONTROL_GROUP_TYPE = 'control_group';

export interface ControlPanelState<TEmbeddableInput extends ControlInput = ControlInput>
  extends PanelState<TEmbeddableInput> {
  order: number;
  width: ControlWidth;
}

export interface ControlsPanels {
  [panelId: string]: ControlPanelState;
}

export interface ControlGroupInput extends EmbeddableInput, ControlInput {
  defaultControlWidth?: ControlWidth;
  controlStyle: ControlStyle;
  panels: ControlsPanels;
}
