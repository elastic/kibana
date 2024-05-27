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
import { HasSerializableState, PresentationContainer } from '@kbn/presentation-containers';
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
  controlStyle: PublishingSubject<ControlStyle>;
};
export interface ControlsPanels<State extends DefaultControlState = DefaultControlState> {
  [panelId: string]: State;
}

export type ControlGroupApi<ChildStateType extends DefaultControlState = DefaultControlState> =
  PresentationContainer &
    DefaultEmbeddableApi<ControlGroupSerializedState> &
    HasSerializableState &
    PublishesFilters &
    PublishesDataViews &
    HasEditCapabilities & // editing for control group settings - this will be a custom action
    PublishesDataLoading & // loading = true if any children loading
    PublishesUnsavedChanges<
      Omit<ControlGroupRuntimeState, 'panels' | 'defaultControlGrow' | 'defaultControlWidth'> & {
        filters: Filter[] | undefined;
      }
    > &
    PublishesControlGroupDisplaySettings &
    Partial<HasParentApi<PublishesUnifiedSearch>> & {
      getChildState: (uuid: string) => ChildStateType;
    };

export type ControlPanelState = DefaultControlState & { type: string };

export interface ControlGroupRuntimeState<
  ChildStateType extends ControlPanelState = ControlPanelState
> {
  chainingSystem: ControlGroupChainingSystem;
  defaultControlGrow?: boolean;
  defaultControlWidth?: ControlWidth;
  controlStyle: ControlStyle;
  panels: ControlsPanels<ChildStateType>;
  showApplySelections?: boolean;
  ignoreParentSettings?: ParentIgnoreSettings;

  anyChildHasUnsavedChanges: boolean;
}

export type ControlGroupSerializedState = Omit<
  ControlGroupRuntimeState,
  | 'panels'
  | 'ignoreParentSettings'
  | 'defaultControlGrow'
  | 'defaultControlWidth'
  | 'anyChildHasUnsavedChanges'
> & {
  panelsJSON: string;
  ignoreParentSettingsJSON: string;
};
