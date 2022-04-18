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

export type ControlGroupChainingSystem = 'HIERARCHICAL' | 'NONE';

export interface ControlsPanels {
  [panelId: string]: ControlPanelState;
}

export interface ControlGroupInput extends EmbeddableInput, ControlInput {
  chainingSystem: ControlGroupChainingSystem;
  defaultControlWidth?: ControlWidth;
  controlStyle: ControlStyle;
  panels: ControlsPanels;
}

// only parts of the Control Group Input should be persisted
export type PersistableControlGroupInput = Pick<
  ControlGroupInput,
  'panels' | 'chainingSystem' | 'controlStyle' | 'ignoreParentSettings'
>;

// panels are json stringified for storage in a saved object.
export type RawControlGroupAttributes = Omit<
  PersistableControlGroupInput,
  'panels' | 'ignoreParentSettings'
> & {
  ignoreParentSettingsJSON: string;
  panelsJSON: string;
};
export interface ControlGroupTelemetry {
  total: number;
  chaining_system: {
    [key: string]: number;
  };
  label_position: {
    [key: string]: number;
  };
  ignore_settings: {
    [key: string]: number;
  };
  by_type: {
    [key: string]: {
      total: number;
      details: { [key: string]: number };
    };
  };
}
