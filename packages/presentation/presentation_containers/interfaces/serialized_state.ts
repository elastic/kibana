/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reference } from '@kbn/content-management-utils';

/**
 * A package containing the serialized Embeddable state, with references extracted. When saving Embeddables using any
 * strategy, this is the format that should be used.
 */
export interface SerializedPanelState<RawStateType extends object = object> {
  references?: Reference[];
  rawState: RawStateType | undefined;
  version?: string;
}

export interface HasSerializableState<StateType extends object = object> {
  serializeState: () => SerializedPanelState<StateType>;
}

export const apiHasSerializableState = (api: unknown | null): api is HasSerializableState => {
  return Boolean((api as HasSerializableState)?.serializeState);
};
