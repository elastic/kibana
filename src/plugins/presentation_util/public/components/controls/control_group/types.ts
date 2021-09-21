/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PanelState, EmbeddableInput } from '../../../../../embeddable/public';
import { ControlStyle, ControlWidth, InputControlInput } from '../types';

export interface ControlGroupInput
  extends EmbeddableInput,
    Omit<InputControlInput, 'twoLineLayout'> {
  inheritParentState: {
    useFilters: boolean;
    useQuery: boolean;
    useTimerange: boolean;
  };
  controlStyle: ControlStyle;
  panels: ControlsPanels;
}

export interface ControlPanelState<TEmbeddableInput extends InputControlInput = InputControlInput>
  extends PanelState<TEmbeddableInput> {
  order: number;
  width: ControlWidth;
}

export interface ControlsPanels {
  [panelId: string]: ControlPanelState;
}
