/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import { ControlLabelPosition, DefaultControlState, ParentIgnoreSettings } from '../types';
import { CONTROL_CHAINING_OPTIONS } from '../constants';

export const CONTROL_GROUP_TYPE = 'control_group';

export type ControlGroupChainingSystem =
  (typeof CONTROL_CHAINING_OPTIONS)[keyof typeof CONTROL_CHAINING_OPTIONS];

export type FieldFilterPredicate = (f: DataViewField) => boolean;

/**
 * ----------------------------------------------------------------
 * Control group state
 * ----------------------------------------------------------------
 */

export interface ControlGroupEditorConfig {
  hideDataViewSelector?: boolean;
  hideWidthSettings?: boolean;
  hideAdditionalSettings?: boolean;
  fieldFilterPredicate?: FieldFilterPredicate;
}

export interface ControlGroupRuntimeState<State extends DefaultControlState = DefaultControlState> {
  chainingSystem: ControlGroupChainingSystem;
  labelPosition: ControlLabelPosition;
  autoApplySelections: boolean;
  ignoreParentSettings?: ParentIgnoreSettings;

  initialChildControlState: ControlPanelsState<State>;

  /*
   * Configuration settings that are never persisted
   * - remove after https://github.com/elastic/kibana/issues/189939 is resolved
   */
  editorConfig?: ControlGroupEditorConfig;
}

export interface ControlGroupSerializedState
  extends Omit<ControlGroupRuntimeState, 'initialChildControlState'> {
  // In runtime state, we refer to this property as `initialChildControlState`, but in
  // the serialized state we transform the state object into an array of state objects
  // to make it easier for API consumers to add new controls without specifying a uuid key.
  controls: Array<ControlPanelState & { id?: string }>;
}

/**
 * ----------------------------------------------------------------
 * Control group panel state
 * ----------------------------------------------------------------
 */

export interface ControlPanelsState<State extends DefaultControlState = DefaultControlState> {
  [panelId: string]: ControlPanelState<State>;
}

export type ControlPanelState<State extends DefaultControlState = DefaultControlState> = State & {
  type: string;
  order: number;
};
