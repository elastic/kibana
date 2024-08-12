/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ParentIgnoreSettings } from '@kbn/controls-plugin/public';
import { ControlGroupSettings } from '@kbn/controls-plugin/public/control_group/types';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { ViewMode } from '@kbn/presentation-publishing';
import {
  ControlGroupApi,
  ControlGroupSerializedState,
  ControlPanelState,
  ControlPanelsState,
} from '../../react_controls/control_group/types';

export type AwaitingControlGroupApi = ControlGroupApi | null;

/** TODO: Use runtime state and then serialize */
export type ControlGroupRendererState = Omit<
  ControlGroupSerializedState,
  'panelsJSON' | 'ignoreParentSettingsJSON'
> & {
  id: string;
  panels: ControlPanelsState<ControlPanelState>;
  viewMode?: ViewMode;
  ignoreParentSettings?: ParentIgnoreSettings;
};

export type FieldFilterPredicate = (f: DataViewField) => boolean;

export interface ControlGroupCreationOptions {
  initialInput?: Partial<ControlGroupRendererState>;
  settings?: ControlGroupSettings;
}
