/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableInput, PanelState } from '@kbn/embeddable-plugin/common/types';
import { SerializableRecord } from '@kbn/utility-types';
import { ControlInput, ControlStyle, ControlWidth } from '../types';

export const CONTROL_GROUP_TYPE = 'control_group';

export interface ControlPanelState<TEmbeddableInput extends ControlInput = ControlInput>
  extends PanelState<TEmbeddableInput> {
  order: number;
  width: ControlWidth;
  grow: boolean;
}

export type ControlGroupChainingSystem = 'HIERARCHICAL' | 'NONE';

export interface ControlsPanels {
  [panelId: string]: ControlPanelState;
}

export interface ControlGroupInput extends EmbeddableInput, ControlInput {
  chainingSystem: ControlGroupChainingSystem;
  defaultControlWidth?: ControlWidth;
  defaultControlGrow?: boolean;
  controlStyle: ControlStyle;
  panels: ControlsPanels;
  showApplySelections?: boolean;
}

/**
 * Only parts of the Control Group Input should be persisted
 */
export const persistableControlGroupInputKeys: Array<
  keyof Pick<
    ControlGroupInput,
    'panels' | 'chainingSystem' | 'controlStyle' | 'ignoreParentSettings' | 'showApplySelections'
  >
> = ['panels', 'chainingSystem', 'controlStyle', 'ignoreParentSettings', 'showApplySelections'];
export type PersistableControlGroupInput = Pick<
  ControlGroupInput,
  typeof persistableControlGroupInputKeys[number]
>;

/**
 * Some use cases need the Persistable Control Group Input to conform to the SerializableRecord format which requires string index signatures in any objects
 */
export type SerializableControlGroupInput = Omit<
  PersistableControlGroupInput,
  'panels' | 'ignoreParentSettings'
> & {
  panels: ControlsPanels & SerializableRecord;
  ignoreParentSettings: PersistableControlGroupInput['ignoreParentSettings'] & SerializableRecord;
};

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
