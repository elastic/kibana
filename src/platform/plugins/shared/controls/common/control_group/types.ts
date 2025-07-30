/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlsGroupState } from '@kbn/controls-schemas';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { DefaultControlState } from '../types';

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

export interface ControlGroupRuntimeState<State extends DefaultControlState = DefaultControlState>
  extends Omit<ControlsGroupState, 'controls'> {
  initialChildControlState: ControlPanelsState<State>;

  /*
   * Configuration settings that are never persisted
   * - remove after https://github.com/elastic/kibana/issues/189939 is resolved
   */
  editorConfig?: ControlGroupEditorConfig;
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
