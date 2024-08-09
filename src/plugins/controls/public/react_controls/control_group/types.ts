/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';

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

import { ParentIgnoreSettings } from '../..';
import { ControlInputTransform } from '../../../common';
import { ControlGroupChainingSystem } from '../../../common/control_group/types';
import { ControlStyle, ControlWidth } from '../../types';
import { DefaultControlState, PublishesControlDisplaySettings } from '../controls/types';
import { ControlFetchContext } from './control_fetch/control_fetch';

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
  DefaultEmbeddableApi<ControlGroupSerializedState, ControlGroupRuntimeState> &
  PublishesFilters &
  PublishesDataViews &
  HasSerializedChildState<ControlPanelState> &
  HasEditCapabilities &
  PublishesDataLoading &
  Pick<PublishesUnsavedChanges, 'unsavedChanges'> &
  PublishesControlGroupDisplaySettings &
  PublishesTimeslice &
  Partial<HasParentApi<PublishesUnifiedSearch> & HasSaveNotification> & {
    asyncResetUnsavedChanges: () => Promise<void>;
    autoApplySelections$: PublishingSubject<boolean>;
    controlFetch$: (controlUuid: string) => Observable<ControlFetchContext>;
    getLastSavedControlState: (controlUuid: string) => object;
    ignoreParentSettings$: PublishingSubject<ParentIgnoreSettings | undefined>;
    allowExpensiveQueries$: PublishingSubject<boolean>;
    untilInitialized: () => Promise<void>;
    openAddDataControlFlyout: (settings?: {
      controlInputTransform?: ControlInputTransform;
    }) => void;
  };

export interface ControlGroupRuntimeState {
  chainingSystem: ControlGroupChainingSystem;
  defaultControlGrow?: boolean;
  defaultControlWidth?: ControlWidth;
  labelPosition: ControlStyle; // TODO: Rename this type to ControlLabelPosition
  autoApplySelections: boolean;
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
  'chainingSystem' | 'labelPosition' | 'autoApplySelections' | 'ignoreParentSettings'
>;

export interface ControlGroupSerializedState {
  chainingSystem: ControlGroupChainingSystem;
  panelsJSON: string;
  ignoreParentSettingsJSON: string;
  // In runtime state, we refer to this property as `labelPosition`;
  // to avoid migrations, we will continue to refer to this property as `controlStyle` in the serialized state
  controlStyle: ControlStyle;
  // In runtime state, we refer to the inverse of this property as `autoApplySelections`
  // to avoid migrations, we will continue to refer to this property as `showApplySelections` in the serialized state
  showApplySelections: boolean | undefined;
}
