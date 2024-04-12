/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  HasSavableState,
  HasSerializableState,
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
export interface DefaultEmbeddableApi<SerializedState extends object = object>
  extends DefaultPresentationPanelApi,
    HasType,
    PublishesUnsavedChanges,
    HasSerializableState<SerializedState> {}

export type ReactEmbeddableApiRegistration<
  StateType extends object = object,
  ApiType extends DefaultEmbeddableApi<StateType> = DefaultEmbeddableApi<StateType>
> = Omit<ApiType, 'uuid' | 'parent' | 'type' | 'unsavedChanges' | 'resetUnsavedChanges'>;

export interface ReactEmbeddableFactory<
  State extends object,
  ApiType extends DefaultEmbeddableApi<State> = DefaultEmbeddableApi<State>
> {
  type: string;
  latestVersion?: string;
  deserializeState: (state: SerializedPanelState) => State;
  buildEmbeddable: (
    initialState: State,
    buildApi: (
      apiRegistration: ReactEmbeddableApiRegistration<State, ApiType>,
      comparators: StateComparators<State>
    ) => ApiType,
    uuid: string,
    parentApi?: unknown
  ) => Promise<{ Component: React.FC<{}>; api: ApiType }>;
}

/**
 * A version of the default embeddable api that supports saving portions of the state
 * by reference.
 */
export interface ByRefCapableEmbeddableApi<
  ByReferenceState extends object = object,
  ByValueState extends object = object
> extends DefaultEmbeddableApi<ByValueState & Partial<ByReferenceState>>,
    HasSavableState<ByReferenceState, ByValueState> {}

export interface ByRefCapableEmbeddableFactory<
  ByReferenceState extends object,
  ByValueState extends object,
  ApiType extends ByRefCapableEmbeddableApi<
    ByReferenceState,
    ByValueState
  > = ByRefCapableEmbeddableApi<ByReferenceState, ByValueState>
> extends Omit<
    ReactEmbeddableFactory<ByValueState, ApiType>,
    'deserializeState' | 'buildEmbeddable'
  > {
  load?: (
    parentState: SerializedPanelState<ByReferenceState | ByValueState>
  ) => Promise<SerializedPanelState<Partial<ByValueState>> | undefined>;
  deserializeState: (
    state: SerializedPanelState<ByValueState & Partial<ByReferenceState>>
  ) => ByValueState & Partial<ByReferenceState>;
  buildEmbeddable: (
    initialState: ByValueState & Partial<ByReferenceState>,
    buildApi: (
      apiRegistration: ReactEmbeddableApiRegistration<
        ByValueState & Partial<ByReferenceState>,
        ApiType
      >,
      comparators: StateComparators<ByValueState & Partial<ByReferenceState>>
    ) => ApiType,
    uuid: string,
    parentApi?: unknown
  ) => Promise<{ Component: React.FC<{}>; api: ApiType }>;
}
