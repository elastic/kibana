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
  ControlGroupEditorConfig,
  ControlGroupRuntimeState,
} from '../../react_controls/control_group/types';

export type ControlGroupRendererApi = ControlGroupApi & {
  /**
   * @deprecated
   * Calling `updateInput` will cause the entire control group to be re-initialized.
   *
   * Therefore, to update the runtime state without `updateInput`, you should add public setters to the
   * relavant API (`ControlGroupApi` or the individual control type APIs) for the state you wish to update
   * and call those setters instead.
   */
  updateInput: (input: Partial<ControlGroupRuntimeState>) => void;
};

export type FieldFilterPredicate = (f: DataViewField) => boolean;
export type AwaitingControlGroupApi = ControlGroupRendererApi | null;

export interface ControlGroupCreationOptions {
  initialState?: Partial<ControlGroupRuntimeState>;
  editorConfig?: ControlGroupEditorConfig;
}
