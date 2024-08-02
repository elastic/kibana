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
import {
  HasSaveNotification,
  HasSerializedChildState,
  PresentationContainer,
} from '@kbn/presentation-containers';
import {
  HasEditCapabilities,
  HasParentApi,
  PublishesDataLoading,
  PublishesFilters,
  PublishesTimeslice,
  PublishesUnifiedSearch,
  PublishesUnsavedChanges,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import { PublishesDataViews } from '@kbn/presentation-publishing/interfaces/publishes_data_views';
import { Observable } from 'rxjs';
import { DefaultControlState, PublishesControlDisplaySettings } from '../types';
import { ControlFetchContext } from './control_fetch/control_fetch';

/**
 * ----------------------------------------------------------------
 * Control group API
 * ----------------------------------------------------------------
 */

/** The control display settings published by the control group are the "default" */
type PublishesControlGroupDisplaySettings = PublishesControlDisplaySettings & {
  labelPosition: PublishingSubject<ControlStyle>;
};

export type ControlGroupUnsavedChanges = Omit<
  ControlGroupRuntimeState,
  'initialChildControlState' | 'defaultControlGrow' | 'defaultControlWidth'
> & {
  filters: Filter[] | undefined;
};

export type ControlGroupApi = PresentationContainer &
  DefaultEmbeddableApi<ControlGroupSerializedState, ControlGroupRuntimeState> &
  PublishesFilters &
  PublishesDataViews &
  HasSerializedChildState<ControlPanelState> &
  HasEditCapabilities &
  PublishesDataLoading &
  PublishesUnsavedChanges &
  PublishesControlGroupDisplaySettings &
  PublishesTimeslice &
  Partial<HasParentApi<PublishesUnifiedSearch> & HasSaveNotification> & {
    autoApplySelections$: PublishingSubject<boolean>;
    controlFetch$: (controlUuid: string) => Observable<ControlFetchContext>;
    getLastSavedControlState: (controlUuid: string) => object;
    ignoreParentSettings$: PublishingSubject<ParentIgnoreSettings | undefined>;
    allowExpensiveQueries$: PublishingSubject<boolean>;
    untilInitialized: () => Promise<void>;
  };

/**
 * ----------------------------------------------------------------
 * Control group state
 * ----------------------------------------------------------------
 */

export interface ControlGroupRuntimeState<State extends DefaultControlState = DefaultControlState> {
  chainingSystem: ControlGroupChainingSystem;
  defaultControlGrow?: boolean;
  defaultControlWidth?: ControlWidth;
  labelPosition: ControlStyle; // TODO: Rename this type to ControlLabelPosition
  autoApplySelections: boolean;
  ignoreParentSettings?: ParentIgnoreSettings;

  initialChildControlState: ControlPanelsState<State>;

  /** TODO: Handle the editor config, which is used with the control group renderer component */
  editorConfig?: {
    hideDataViewSelector?: boolean;
    hideWidthSettings?: boolean;
    hideAdditionalSettings?: boolean;
  };
}

export interface ControlGroupSerializedState {
  chainingSystem: ControlGroupChainingSystem;
  panelsJSON: string; // stringified version of ControlSerializedState
  ignoreParentSettingsJSON: string;
  // In runtime state, we refer to this property as `labelPosition`;
  // to avoid migrations, we will continue to refer to this property as `controlStyle` in the serialized state
  controlStyle: ControlStyle;
  // In runtime state, we refer to the inverse of this property as `autoApplySelections`
  // to avoid migrations, we will continue to refer to this property as `showApplySelections` in the serialized state
  showApplySelections: boolean | undefined;
}

export type ControlGroupEditorState = Pick<
  ControlGroupRuntimeState,
  'chainingSystem' | 'labelPosition' | 'autoApplySelections' | 'ignoreParentSettings'
>;

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

/**
 * `SerializedControlPanelState` is flattened and converted to `ControlPanelState` via the deserialize method of the
 * control group, so the type is only relevent to the control group (no individual control ever sees `explicitInput`)
 */
export interface SerializedControlPanelState<
  State extends DefaultControlState = DefaultControlState
> extends DefaultControlState {
  type: string;
  order: number;
  explicitInput: Omit<State, keyof DefaultControlState> & { id: string };
}
