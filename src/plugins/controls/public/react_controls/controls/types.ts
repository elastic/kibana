/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import { SerializedPanelState } from '@kbn/presentation-containers';
import { PanelCompatibleComponent } from '@kbn/presentation-panel-plugin/public/panel_component/types';
import {
  HasParentApi,
  HasType,
  HasUniqueId,
  PublishesBlockingError,
  PublishesDataLoading,
  PublishesDisabledActionIds,
  PublishesPanelTitle,
  PublishesUnsavedChanges,
  PublishingSubject,
  StateComparators,
} from '@kbn/presentation-publishing';
import { CanClearSelections, ControlWidth } from '../../types';

import { ControlGroupApi } from '../control_group/types';

export interface HasCustomPrepend {
  CustomPrependComponent: React.FC<{}>;
}

export type DefaultControlApi = PublishesDataLoading &
  PublishesBlockingError &
  PublishesUnsavedChanges &
  Partial<PublishesPanelTitle & PublishesDisabledActionIds & HasCustomPrepend> &
  CanClearSelections &
  HasType &
  HasUniqueId &
  HasParentApi<ControlGroupApi> & {
    // Can not use HasSerializableState interface
    // HasSerializableState types serializeState as function returning 'MaybePromise'
    // Controls serializeState is sync
    serializeState: () => SerializedPanelState<DefaultControlState>;
    /** TODO: Make these non-public as part of https://github.com/elastic/kibana/issues/174961 */
    setDataLoading: (loading: boolean) => void;
    setBlockingError: (error: Error | undefined) => void;
    grow: PublishingSubject<boolean | undefined>;
    width: PublishingSubject<ControlWidth | undefined>;
  };

export interface DefaultControlState {
  grow?: boolean;
  width?: ControlWidth;
  dataViewId?: string;
}

export type ControlApiRegistration<ControlApi extends DefaultControlApi = DefaultControlApi> = Omit<
  ControlApi,
  'uuid' | 'parentApi' | 'type' | 'unsavedChanges' | 'resetUnsavedChanges'
>;

export type ControlApiInitialization<ControlApi extends DefaultControlApi = DefaultControlApi> =
  Omit<
    ControlApiRegistration<ControlApi>,
    'serializeState' | 'getTypeDisplayName' | 'clearSelections'
  >;

// TODO: Move this to the Control plugin's setup contract
export interface ControlFactory<
  State extends DefaultControlState = DefaultControlState,
  ControlApi extends DefaultControlApi = DefaultControlApi
> {
  type: string;
  order?: number;
  getIconType: () => string;
  getDisplayName: () => string;
  buildControl: (
    initialState: State,
    buildApi: (
      apiRegistration: ControlApiRegistration<ControlApi>,
      comparators: StateComparators<State>
    ) => ControlApi,
    uuid: string,
    parentApi: ControlGroupApi
  ) => Promise<{ api: ControlApi; Component: React.FC<{ className: string }> }>;
}

export type ControlStateManager<State extends object = object> = {
  [key in keyof Required<State>]: BehaviorSubject<State[key]>;
};

export interface ControlPanelProps<
  ApiType extends DefaultControlApi = DefaultControlApi,
  PropsType extends {} = { className: string }
> {
  uuid: string;
  Component: PanelCompatibleComponent<ApiType, PropsType>;
}
