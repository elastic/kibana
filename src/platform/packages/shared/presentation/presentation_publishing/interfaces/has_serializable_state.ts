/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface HasSerializableState<SerializedState extends object = object> {
  /**
   * Serializes all state into a format that can be saved into
   * some external store. The opposite of `deserialize` in the {@link ReactEmbeddableFactory}
   */
  serializeState: () => SerializedState;
}

export const apiHasSerializableState = (api: unknown | null): api is HasSerializableState => {
  return Boolean((api as HasSerializableState)?.serializeState);
};
