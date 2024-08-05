/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ParentIgnoreSettings } from '@kbn/controls-plugin/public';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { ViewMode } from '@kbn/presentation-publishing';
import type {
  ControlGroupApi,
  ControlGroupSerializedState,
  ControlInputTransform,
  ControlPanelState,
  SerializedControlPanelState,
} from '../types';

export type ControlGroupRendererApi = ControlGroupApi & {
  openAddDataControlFlyout: (options?: {
    controlInputTransform?: ControlInputTransform;
    onSave?: (id: string) => void;
  }) => void;
};

export type AwaitingControlGroupApi = ControlGroupRendererApi | null;

export type ControlGroupRendererState = Omit<
  ControlGroupSerializedState,
  'panelsJSON' | 'ignoreParentSettingsJSON'
> & {
  id: string;
  panels: {
    [panelId: string]: ControlPanelState<SerializedControlPanelState>;
  };
  viewMode?: ViewMode;
  ignoreParentSettings?: ParentIgnoreSettings;
};

export interface ControlGroupSettings {
  showAddButton?: boolean;
  editorConfig?: {
    hideDataViewSelector?: boolean;
    hideWidthSettings?: boolean;
    hideAdditionalSettings?: boolean;
    fieldFilterPredicate?: FieldFilterPredicate;
  };
}

export type FieldFilterPredicate = (f: DataViewField) => boolean;

export interface ControlGroupCreationOptions {
  initialInput?: Partial<ControlGroupRendererState>;
  settings?: ControlGroupSettings;
}
