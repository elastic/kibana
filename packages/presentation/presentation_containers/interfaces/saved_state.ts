/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializedPanelState } from './serialized_state';

export interface HasSavableState<
  ByReferenceState extends object = object,
  ByValueState extends object = object
> {
  saveState: (
    stateToSave: SerializedPanelState<ByValueState>
  ) => Promise<SerializedPanelState<ByValueState | ByReferenceState>>;
}

export const apiHasSavableState = (api: unknown | null): api is HasSavableState => {
  return Boolean((api as HasSavableState)?.saveState);
};
