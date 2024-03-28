/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  HasSerializableState,
  PresentationContainer,
  SerializedPanelState,
} from '@kbn/presentation-containers';
import { DefaultPresentationPanelApi } from '@kbn/presentation-panel-plugin/public/panel_component/types';
import { HasType, PublishesUnsavedChanges, StateComparators } from '@kbn/presentation-publishing';
import React, { ReactElement } from 'react';

export type ReactEmbeddableRegistration<
  ApiType extends DefaultEmbeddableApi = DefaultEmbeddableApi
> = (ref: React.ForwardedRef<ApiType>) => ReactElement | null;

/**
 * The default embeddable API that all Embeddables must implement.
 *
 * Before adding anything to this interface, please be certain that it belongs in *every* embeddable.
 */
export interface DefaultEmbeddableApi<StateType extends object = object>
  extends DefaultPresentationPanelApi,
    HasType,
    PublishesUnsavedChanges,
    HasSerializableState<StateType> {}

export type ReactEmbeddableApiRegistration<
  StateType extends object = object,
  ApiType extends DefaultEmbeddableApi<StateType> = DefaultEmbeddableApi<StateType>
> = Omit<ApiType, 'uuid' | 'parent' | 'type' | 'unsavedChanges' | 'resetUnsavedChanges'>;

export interface ReactEmbeddableFactory<
  StateType extends object = object,
  ApiType extends DefaultEmbeddableApi<StateType> = DefaultEmbeddableApi<StateType>
> {
  type: string;
  latestVersion?: string;
  deserializeState: (state: SerializedPanelState) => StateType;
  buildEmbeddable: (
    initialState: StateType,
    buildApi: (
      apiRegistration: ReactEmbeddableApiRegistration<StateType, ApiType>,
      comparators: StateComparators<StateType>
    ) => ApiType,
    uuid: string,
    parentApi?: PresentationContainer
  ) => Promise<{ Component: React.FC<{}>; api: ApiType }>;
}
