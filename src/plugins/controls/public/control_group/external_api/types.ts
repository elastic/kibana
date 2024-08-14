/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import {
  ControlGroupApi,
  ControlGroupRuntimeState,
  ControlGroupSettings,
} from '../../react_controls/control_group/types';
// import { AddOptionsListControlProps } from './control_group_input_builder';

export type ControlGroupRendererApi = ControlGroupApi & {
  save: () => void;
  reload: () => void;
  // addOptionsListControl: (controlProps: AddOptionsListControlProps) => void;
};
export type FieldFilterPredicate = (f: DataViewField) => boolean;
export type AwaitingControlGroupApi = ControlGroupRendererApi | null;

export interface ControlGroupCreationOptions {
  initialState?: Partial<ControlGroupRuntimeState>;
  settings?: ControlGroupSettings;
}
