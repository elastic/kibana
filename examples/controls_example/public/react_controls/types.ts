/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlWidth } from '@kbn/controls-plugin/public/types';
import { DataViewField } from '@kbn/data-views-plugin/common';
import {
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
  PublishingSubject,
  StateComparators,
} from '@kbn/presentation-publishing';
import { ControlGroupApi } from './control_group/types';

export interface PublishesControlDisplaySettings {
  grow: PublishingSubject<boolean | undefined>;
  width: PublishingSubject<ControlWidth | undefined>;
}

export interface HasCustomPrepend {
  getCustomPrepend: () => React.FC<{}>;
}

/** This is the stuff the control group cares about */
export type DefaultControlApi = PublishesDataLoading &
  PublishesBlockingError &
  PublishesUnsavedChanges &
  Partial<PublishesDisabledActionIds> &
  PublishesControlDisplaySettings &
  Partial<PublishesPanelTitle & HasCustomPrepend> &
  Partial<PublishesFilter & PublishesTimeslice & PublishesPanelTitle & HasCustomPrepend> & // can publish either filters or timeslice
  HasType &
  HasUniqueId &
  HasParentApi<ControlGroupApi>;

export interface DefaultControlState {
  grow?: boolean;
  width?: ControlWidth;
}

export type ControlApiRegistration<ControlApi extends DefaultControlApi = DefaultControlApi> = Omit<
  ControlApi,
  'uuid' | 'parentApi' | 'type' | 'unsavedChanges' | 'resetUnsavedChanges' // | 'grow' | 'width'
>;

// export type ControlStateRegistration<
//   ControlState extends DefaultControlState = DefaultControlState
// > = Omit<ControlState, 'grow' | 'width'>;

export interface ControlFactory<
  State extends object = object,
  ControlApi extends DefaultControlApi = DefaultControlApi
> {
  type: string;
  getIconType: () => string;
  getDisplayName: () => string;
  // getSupportedFieldTypes: () => string[];
  // isFieldCompatible?: (field: DataViewField) => boolean;
  buildControl: (
    initialState: State,
    buildApi: (
      apiRegistration: ControlApiRegistration<ControlApi>,
      comparators: StateComparators<State>
    ) => ControlApi,
    uuid: string,
    parentApi: ControlGroupApi
  ) => { api: ControlApi; Component: React.FC<{}> };
}
