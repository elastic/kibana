/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apiHasRuntimeChildState, HasSerializedChildState } from "@kbn/presentation-containers";
import { ReactEmbeddableFactory } from "./types";

export async function getInitialRuntimeState<SerializedState extends object = object, RuntimeState extends object = object>(
  parentApi: HasSerializedChildState<SerializedState>, 
  deserializeState: ReactEmbeddableFactory<SerializedState, RuntimeState>['deserializeState'],
  uuid: string
) {
  const serializedState = parentApi.getSerializedStateForChild(uuid);
  const lastSavedRuntimeState = serializedState
    ? await deserializeState(serializedState)
    : ({} as RuntimeState);

  // If the parent provides runtime state for the child (usually as a state backup or cache),
  // we merge it with the last saved runtime state.
  const partialRuntimeState = apiHasRuntimeChildState<RuntimeState>(parentApi)
    ? parentApi.getRuntimeStateForChild(uuid) ?? ({} as Partial<RuntimeState>)
    : ({} as Partial<RuntimeState>);

  return { ...lastSavedRuntimeState, ...partialRuntimeState };
}