/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PanelCompatibleComponent } from '@kbn/presentation-panel-plugin/public/panel_component/types';
import {
  HasParentApi,
  HasType,
  HasUniqueId,
  HasSerializableState,
  PublishesBlockingError,
  PublishesDataLoading,
  PublishesDisabledActionIds,
  PublishesTitle,
  PublishesUnsavedChanges,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import type { ControlWidth } from '@kbn/controls-schemas';

import { DefaultControlState } from '../../common/types';
import { ControlGroupApi } from '../control_group/types';
import { CanClearSelections } from '../types';

export interface HasCustomPrepend {
  CustomPrependComponent: React.FC<{}>;
}

export type DefaultControlApi = PublishesDataLoading &
  PublishesBlockingError &
  PublishesUnsavedChanges &
  Partial<PublishesTitle & PublishesDisabledActionIds & HasCustomPrepend> &
  Partial<CanClearSelections> &
  HasType &
  HasUniqueId &
  HasSerializableState<DefaultControlState> &
  HasParentApi<ControlGroupApi> & {
    setDataLoading: (loading: boolean) => void;
    setBlockingError: (error: Error | undefined) => void;
    grow$: PublishingSubject<boolean | undefined>;
    width$: PublishingSubject<ControlWidth | undefined>;
  };

export type ControlApiRegistration<ControlApi extends DefaultControlApi = DefaultControlApi> = Omit<
  ControlApi,
  'uuid' | 'parentApi' | 'type'
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
  buildControl: ({
    initialState,
    finalizeApi,
    uuid,
    controlGroupApi,
  }: {
    initialState: State;
    finalizeApi: (apiRegistration: ControlApiRegistration<ControlApi>) => ControlApi;
    uuid: string;
    controlGroupApi: ControlGroupApi;
  }) => Promise<{ api: ControlApi; Component: React.FC<{ className: string }> }>;
}

export interface ControlPanelProps<
  ApiType extends DefaultControlApi = DefaultControlApi,
  PropsType extends {} = { className: string }
> {
  uuid: string;
  Component: PanelCompatibleComponent<ApiType, PropsType>;
}
