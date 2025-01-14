/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type BehaviorSubject } from 'rxjs';

import { type HasSerializableState } from '@kbn/presentation-containers';
import { type PanelCompatibleComponent } from '@kbn/presentation-panel-plugin/public/panel_component/types';
import {
  type HasParentApi,
  type HasType,
  type HasUniqueId,
  type PublishesBlockingError,
  type PublishesDataLoading,
  type PublishesDisabledActionIds,
  type PublishesPanelTitle,
  type PublishesUnsavedChanges,
  type PublishingSubject,
  type StateComparators,
} from '@kbn/presentation-publishing';

import { type ControlWidth, type DefaultControlState } from '../../common/types';
import { type ControlGroupApi } from '../control_group/types';
import { type CanClearSelections } from '../types';

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
  HasSerializableState<DefaultControlState> &
  HasParentApi<ControlGroupApi> & {
    setDataLoading: (loading: boolean) => void;
    setBlockingError: (error: Error | undefined) => void;
    grow: PublishingSubject<boolean | undefined>;
    width: PublishingSubject<ControlWidth | undefined>;
  };

export type ControlApiRegistration<ControlApi extends DefaultControlApi = DefaultControlApi> = Omit<
  ControlApi,
  'uuid' | 'parentApi' | 'type' | 'unsavedChanges' | 'resetUnsavedChanges'
>;

export type ControlApiInitialization<ControlApi extends DefaultControlApi = DefaultControlApi> =
  Omit<
    ControlApiRegistration<ControlApi>,
    'serializeState' | 'getTypeDisplayName' | keyof CanClearSelections
  >;

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
