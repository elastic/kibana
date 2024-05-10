/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlGroupApi } from '@kbn/controls-plugin/public/control_group/types';
import { ControlWidth } from '@kbn/controls-plugin/public/types';
import { DataViewField } from '@kbn/data-views-plugin/common';
import {
  HasEditCapabilities,
  HasParentApi,
  HasType,
  HasUniqueId,
  PublishesBlockingError,
  PublishesDataLoading,
  PublishesDisabledActionIds,
  PublishesFilter,
  PublishesPanelTitle,
  PublishesTimeslice,
  PublishesUnsavedChanges,
  PublishesWritablePanelTitle,
  PublishingSubject,
  SerializedTitles,
  StateComparators,
} from '@kbn/presentation-publishing';
import { PublishesDataView } from '@kbn/presentation-publishing/interfaces/publishes_data_views';

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
