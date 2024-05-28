/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  HasSerializableState,
  HasSnapshottableState,
  SerializedPanelState,
} from '@kbn/presentation-containers';
import { DefaultPresentationPanelApi } from '@kbn/presentation-panel-plugin/public/panel_component/types';
import { HasType, PublishesUnsavedChanges, StateComparators } from '@kbn/presentation-publishing';
import { MaybePromise } from '@kbn/utility-types';
import React from 'react';

/**
 * The default embeddable API that all Embeddables must implement.
 *
 * Before adding anything to this interface, please be certain that it belongs in *every* embeddable.
 */
export interface DefaultEmbeddableApi<
  SerializedState extends object = object,
  RuntimeState extends object = SerializedState
> extends DefaultPresentationPanelApi,
    HasType,
    PublishesUnsavedChanges,
    HasSerializableState<SerializedState>,
    HasSnapshottableState<RuntimeState> {}

/**
 * A subset of the default embeddable API used in registration to allow implementors to omit aspects
 * of the API that will be automatically added by the system.
 */
export type ReactEmbeddableApiRegistration<
  SerializedState extends object = object,
  Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>
> = Omit<
  Api,
  'uuid' | 'parent' | 'type' | 'unsavedChanges' | 'resetUnsavedChanges' | 'snapshotRuntimeState'
>;

/**
 * The React Embeddable Factory interface is used to register a series of functions that
 * create and manage an embeddable instance.
 *
 * Embeddables are React components that manage their own state, can be serialized and
 * deserialized, and return an API that can be used to interact with them imperatively.
 **/
export interface ReactEmbeddableFactory<
  SerializedState extends object = object,
  Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>,
  RuntimeState extends object = SerializedState
> {
  /**
   * A unique key for the type of this embeddable. The React Embeddable Renderer will use this type
   * to find this factory.
   */
  type: string;

  /**
   * A required asynchronous function that transforms serialized state into runtime state.
   *
   * This could be used to:
   * - Load state from some external store
   * - Inject references provided by the parent
   * - Migrate the state to a newer version (this must be undone when serializing)
   */
  deserializeState: (
    panelState: SerializedPanelState<SerializedState>
  ) => MaybePromise<RuntimeState>;

  /**
   * A required async function that builds your embeddable component and a linked API instance. The API
   * and component will be combined together by the ReactEmbeddableRenderer. Initial state will contain the result of
   * the deserialize function.
   *
   * The returned API must extend {@link HasSerializableState} which does the opposite of the deserializeState
   * function.
   */
  buildEmbeddable: (
    initialState: RuntimeState,
    buildApi: (
      apiRegistration: ReactEmbeddableApiRegistration<SerializedState, Api>,
      comparators: StateComparators<RuntimeState>
    ) => Api,
    uuid: string,
    parentApi?: unknown
  ) => Promise<{ Component: React.FC<{}>; api: Api }>;
}
