/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ControlGroupChainingSystem,
  ControlsPanels,
} from '@kbn/controls-plugin/common/control_group/types';
import { ParentIgnoreSettings } from '@kbn/controls-plugin/public';
import { ControlStyle, ControlWidth } from '@kbn/controls-plugin/public/types';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import {
  HasSerializableState,
  PresentationContainer,
  PublishesLastSavedState,
} from '@kbn/presentation-containers';
import {
  HasEditCapabilities,
  HasParentApi,
  HasType,
  HasUniqueId,
  PublishesBlockingError,
  PublishesDataLoading,
  PublishesDisabledActionIds,
  PublishesFilter,
  PublishesFilters,
  PublishesPanelTitle,
  PublishesTimeslice,
  PublishesUnifiedSearch,
  PublishesUnsavedChanges,
  PublishingSubject,
  StateComparators,
} from '@kbn/presentation-publishing';
import {
  PublishesDataView,
  PublishesDataViews,
} from '@kbn/presentation-publishing/interfaces/publishes_data_views';

export type ControlGroupApi = PresentationContainer &
  DefaultEmbeddableApi<ControlGroupSerializedState> &
  HasSerializableState &
  PublishesFilters &
  // PublishesSettings & // published so children can use it... Might be unnecessary?
  PublishesDataViews &
  HasEditCapabilities & // editing for control group settings - this will be a custom action
  PublishesDataLoading & // loading = true if any children loading
  // PublishesUnsavedChanges<PersistableControlGroupInput> & // unsaved changes = diff published filters + combine all children unsaved changes
  PublishesDefaultControlDisplaySettings &
  Partial<HasParentApi<PublishesUnifiedSearch & PublishesLastSavedState>>;

export interface ControlGroupRuntimeState {
  chainingSystem: ControlGroupChainingSystem;
  defaultControlWidth?: ControlWidth;
  defaultControlGrow?: boolean;
  controlStyle: ControlStyle;
  panels: ControlsPanels;
  showApplySelections?: boolean;
  ignoreParentSettings?: ParentIgnoreSettings;
}

export type ControlGroupSerializedState = Omit<
  ControlGroupRuntimeState,
  'panels' | 'ignoreParentSettings'
> & {
  panelsJSON: string;
  ignoreParentSettingsJSON: string;
};

export interface PublishesDefaultControlDisplaySettings {
  grow: PublishingSubject<boolean>;
  width: PublishingSubject<ControlWidth>;
}

export interface PublishesControlDisplaySettings {
  grow: PublishingSubject<boolean | undefined>;
  width: PublishingSubject<ControlWidth | undefined>;
}

/** This is the stuff the control group cares about */
export type DefaultControlApi = PublishesDataLoading &
  PublishesBlockingError &
  PublishesUnsavedChanges &
  Partial<PublishesDisabledActionIds> &
  PublishesControlDisplaySettings &
  Partial<PublishesFilter & PublishesTimeslice> & // can publish either filters or timeslice
  HasType &
  HasUniqueId &
  HasParentApi<ControlGroupApi>;

export interface DefaultControlState {
  grow?: boolean;
  width?: ControlWidth;
}

export type DataControlApi = DefaultControlApi &
  Pick<PublishesPanelTitle, 'panelTitle' | 'defaultPanelTitle'> & // does not need to be writable because control group does not have control - internally writable but not externally
  HasEditCapabilities &
  PublishesDataView;

// {
//   customSettings?: PublishingSubject<object | undefined>;
//   fieldName: PublishingSubject<string>;
// };

export interface DefaultDataControlState extends DefaultControlState {
  dataViewId: string;
  fieldName: string;
  title?: string; // custom label
}

export type ControlApiRegistration<ControlApi extends DefaultControlApi = DefaultControlApi> = Omit<
  ControlApi,
  'uuid' | 'parent' | 'type' | 'unsavedChanges' | 'resetUnsavedChanges' | 'grow' | 'width'
>;

export type ControlStateRegistration<
  ControlState extends DefaultControlState = DefaultControlState
> = Omit<ControlState, 'grow' | 'width'>;

export interface ControlFactory<
  State extends object = object,
  ControlApi extends DefaultControlApi = DefaultControlApi
> {
  type: string;
  getIconType: () => string;
  getDisplayName: () => string;
  // getSupportedFieldTypes: () => string[];
  // isFieldCompatible?: (field: DataViewField) => boolean;
  // CustomOptionsComponent: React.FC<{ internalApi?: InternalApi }>; // internal api manages state
  buildControl: (
    initialState: State,
    buildApi: (
      apiRegistration: ControlApiRegistration<ControlApi>,
      comparators: StateComparators<ControlStateRegistration<State>>
    ) => ControlApi,
    uuid: string,
    parentApi: ControlGroupApi
  ) => { api: ControlApi; Component: React.FC<{}> };
}

export interface DataControlFactory<State extends object = object>
  extends ControlFactory<State, DataControlApi> {
  isFieldCompatible: (field: DataViewField) => boolean;
  CustomOptionsComponent?: React.FC<{ stateManager: unknown }>; // internal api manages state
}

export const isDataControlFactory = <State extends object = object>(
  factory: ControlFactory<State, any>
): factory is DataControlFactory<State> => {
  return typeof (factory as DataControlFactory).isFieldCompatible === 'function';
};
