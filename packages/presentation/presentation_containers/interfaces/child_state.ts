/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializedPanelState } from './serialized_state';

export interface HasSerializedChildState<SerializedState extends object = object> {
  getSerializedStateForChild: (
    childId: string
  ) => SerializedPanelState<SerializedState> | undefined;
}

export interface HasRuntimeChildState<RuntimeState extends object = object> {
  getRuntimeStateForChild: (childId: string) => Partial<RuntimeState> | undefined;
}

export const apiHasSerializedChildState = <SerializedState extends object = object>(
  api: unknown
): api is HasSerializedChildState<SerializedState> => {
  return Boolean(api && (api as HasSerializedChildState).getSerializedStateForChild);
};

export const apiHasRuntimeChildState = <RuntimeState extends object = object>(
  api: unknown
): api is HasRuntimeChildState<RuntimeState> => {
  return Boolean(api && (api as HasRuntimeChildState).getRuntimeStateForChild);
};
