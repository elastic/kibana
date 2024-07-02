/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';

import { SerializedStyles } from '@emotion/react';
import { ControlWidth } from '@kbn/controls-plugin/public/types';
import { HasSerializableState } from '@kbn/presentation-containers';
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

import { ControlGroupApi } from './control_group/types';

export interface PublishesControlDisplaySettings {
  grow: PublishingSubject<boolean | undefined>;
  width: PublishingSubject<ControlWidth | undefined>;
}

export interface HasCustomPrepend {
  CustomPrependComponent: React.FC<{}>;
}

export type DefaultControlApi = PublishesDataLoading &
  PublishesBlockingError &
  PublishesUnsavedChanges &
  PublishesControlDisplaySettings &
  Partial<PublishesPanelTitle & PublishesDisabledActionIds & HasCustomPrepend> &
  HasType &
  HasUniqueId &
  HasSerializableState &
  HasParentApi<ControlGroupApi> & {
    setDataLoading: (loading: boolean) => void;
    setBlockingError: (error: Error | undefined) => void;
  };

export interface DefaultControlState {
  grow?: boolean;
  width?: ControlWidth;
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
  ) => { api: ControlApi; Component: React.FC<{}> };
}

export type ControlStateManager<State extends object = object> = {
  [key in keyof Required<State>]: BehaviorSubject<State[key]>;
};

export interface ControlPanelProps<
  ApiType extends DefaultControlApi = DefaultControlApi,
  PropsType extends {} = { css: SerializedStyles }
> {
  Component: PanelCompatibleComponent<ApiType, PropsType>;
}
