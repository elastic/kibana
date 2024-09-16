/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
  PublishesDisabledActionIds,
  PublishesFilters,
  PublishesTimeslice,
  PublishesUnifiedSearch,
  PublishesUnsavedChanges,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import { PublishesDataViews } from '@kbn/presentation-publishing/interfaces/publishes_data_views';
import { Observable } from 'rxjs';

import { PublishesReload } from '@kbn/presentation-publishing/interfaces/fetch/publishes_reload';
import { ControlGroupChainingSystem } from '../../../common/control_group/types';
import { ControlStyle } from '../../types';
import { DefaultControlState } from '../controls/types';
import { ControlFetchContext } from './control_fetch/control_fetch';
import { FieldFilterPredicate } from '../../control_group/types';
import { ParentIgnoreSettings } from '../../../common';

/**
 * ----------------------------------------------------------------
 * Control group API
 * ----------------------------------------------------------------
 */

export type ControlStateTransform<State extends DefaultControlState = DefaultControlState> = (
  newState: Partial<State>,
  controlType: string
) => Partial<State>;

export type ControlGroupUnsavedChanges = Omit<
  ControlGroupRuntimeState,
  'initialChildControlState'
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
  Pick<PublishesUnsavedChanges<ControlGroupRuntimeState>, 'unsavedChanges'> &
  PublishesTimeslice &
  PublishesDisabledActionIds &
  Partial<HasParentApi<PublishesUnifiedSearch> & HasSaveNotification & PublishesReload> & {
    allowExpensiveQueries$: PublishingSubject<boolean>;
    autoApplySelections$: PublishingSubject<boolean>;
    ignoreParentSettings$: PublishingSubject<ParentIgnoreSettings | undefined>;
    labelPosition: PublishingSubject<ControlStyle>;

    asyncResetUnsavedChanges: () => Promise<void>;
    controlFetch$: (controlUuid: string) => Observable<ControlFetchContext>;
    openAddDataControlFlyout: (options?: {
      controlStateTransform?: ControlStateTransform;
      onSave?: () => void;
    }) => void;
    untilInitialized: () => Promise<void>;

    /** Public getters */
    getEditorConfig: () => ControlGroupEditorConfig | undefined;
    getLastSavedControlState: (controlUuid: string) => object;

    /** Public setters */
    setChainingSystem: (chainingSystem: ControlGroupChainingSystem) => void;
  };

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
  labelPosition: ControlStyle; // TODO: Rename this type to ControlLabelPosition
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
  extends Pick<ControlGroupRuntimeState, 'chainingSystem' | 'editorConfig'> {
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
