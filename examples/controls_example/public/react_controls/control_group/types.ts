/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlGroupChainingSystem } from '@kbn/controls-plugin/common/control_group/types';
import { ParentIgnoreSettings } from '@kbn/controls-plugin/public';
import { ControlStyle, ControlWidth } from '@kbn/controls-plugin/public/types';
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { Filter } from '@kbn/es-query';
import { HasSerializedChildState, PresentationContainer } from '@kbn/presentation-containers';
import {
  HasEditCapabilities,
  HasParentApi,
  PublishesDataLoading,
  PublishesFilters,
  PublishesUnifiedSearch,
  PublishesUnsavedChanges,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import { PublishesDataViews } from '@kbn/presentation-publishing/interfaces/publishes_data_views';
import { DefaultControlState, PublishesControlDisplaySettings } from '../types';

/** The control display settings published by the control group are the "default" */
type PublishesControlGroupDisplaySettings = PublishesControlDisplaySettings & {
  labelPosition: PublishingSubject<ControlStyle>;
};
export interface ControlPanelsState<ControlState extends ControlPanelState = ControlPanelState> {
  [panelId: string]: ControlState;
}

export type ControlGroupUnsavedChanges = Omit<
  ControlGroupRuntimeState,
  'initialChildControlState' | 'defaultControlGrow' | 'defaultControlWidth'
> & {
  filters: Filter[] | undefined;
};

export type ControlPanelState = DefaultControlState & { type: string; order: number };

export type ControlGroupApi = PresentationContainer &
  DefaultEmbeddableApi<ControlGroupSerializedState> &
  PublishesFilters &
  PublishesDataViews &
  HasSerializedChildState<ControlPanelState> &
  HasEditCapabilities &
  PublishesDataLoading &
  PublishesUnsavedChanges &
  PublishesControlGroupDisplaySettings &
  Partial<HasParentApi<PublishesUnifiedSearch>>;

export interface ControlGroupRuntimeState {
  chainingSystem: ControlGroupChainingSystem;
  defaultControlGrow?: boolean;
  defaultControlWidth?: ControlWidth;
  labelPosition: ControlStyle; // TODO: Rename this type to ControlLabelPosition
  showApplySelections?: boolean;
  ignoreParentSettings?: ParentIgnoreSettings;

  initialChildControlState: ControlPanelsState<ControlPanelState>;
  /** TODO: Handle the editor config, which is used with the control group renderer component */
  editorConfig?: {
    hideDataViewSelector?: boolean;
    hideWidthSettings?: boolean;
    hideAdditionalSettings?: boolean;
  };
}

export type ControlGroupEditorState = Pick<
  ControlGroupRuntimeState,
  'chainingSystem' | 'labelPosition' | 'showApplySelections' | 'ignoreParentSettings'
>;

export type ControlGroupSerializedState = Omit<
  ControlGroupRuntimeState,
  | 'labelPosition'
  | 'ignoreParentSettings'
  | 'defaultControlGrow'
  | 'defaultControlWidth'
  | 'anyChildHasUnsavedChanges'
  | 'initialChildControlState'
> & {
  panelsJSON: string;
  ignoreParentSettingsJSON: string;
  // In runtime state, we refer to this property as `labelPosition`; however, to avoid migrations, we will
  // continue to refer to this property as the legacy `controlStyle` in the serialized state
  controlStyle: ControlStyle;
};
