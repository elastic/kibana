/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DefaultPresentationPanelApi } from '@kbn/presentation-panel-plugin/public/panel_component/types';
import {
  CanLockHoverActions,
  HasSerializableState,
  HasType,
  PublishesPhaseEvents,
  SerializedPanelState,
} from '@kbn/presentation-publishing';
import React from 'react';

/**
 * The default embeddable API that all Embeddables must implement.
 *
 * Before adding anything to this interface, please be certain that it belongs in *every* embeddable.
 */
export interface DefaultEmbeddableApi<SerializedState extends object = object>
  extends DefaultPresentationPanelApi,
    HasType,
    PublishesPhaseEvents,
    HasSerializableState<SerializedState> {}

/**
 * Defines the subset of the default embeddable API that the `setApi` method uses, which allows implementors
 * to omit aspects of the API that will be automatically added by `setApi`.
 */
export type EmbeddableApiRegistration<
  SerializedState extends object = object,
  Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>
> = Omit<Api, 'uuid' | 'parent' | 'type' | 'phase$' | keyof CanLockHoverActions>;

export interface BuildEmbeddableProps<
  SerializedState extends object = object,
  Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>
> {
  /**
   * Initial serialized state provided by the parent.
   */
  initialState: SerializedPanelState<SerializedState>;

  /**
   * A function that adds default & required methods to the passed API registration object.
   */
  finalizeApi: (apiRegistration: EmbeddableApiRegistration<SerializedState, Api>) => Api;

  /**
   * The UUID for this embeddable, which will be generated or provided by the parent.
   */
  uuid: string;

  /**
   * An optional parent API.
   */
  parentApi: unknown | undefined;
}

/**
 * The React Embeddable Factory interface is used to register a series of functions that
 * create and manage an embeddable instance.
 *
 * Embeddables are React components that manage their own state, can be serialized and
 * deserialized, and return an API that can be used to interact with them imperatively.
 **/
export interface EmbeddableFactory<
  SerializedState extends object = object,
  Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>
> {
  /**
   * A unique key for the type of this embeddable. The React Embeddable Renderer will use this type
   * to find this factory.
   */
  type: string;

  /**
   * A required async function that builds your embeddable component and a linked API instance. The API
   * and component will be combined together by the ReactEmbeddableRenderer.
   */
  buildEmbeddable: (
    props: BuildEmbeddableProps<SerializedState, Api>
  ) => Promise<{ Component: React.FC<{}>; api: Api }>;
}
