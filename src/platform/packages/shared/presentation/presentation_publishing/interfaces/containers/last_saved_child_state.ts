/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';

export interface HasLastSavedChildState<SerializedState extends object = object> {
  lastSavedStateForChild$: (childId: string) => Observable<SerializedState | undefined>;
  getLastSavedStateForChild: (childId: string) => SerializedState | undefined;
}

export const apiHasLastSavedChildState = <SerializedState extends object = object>(
  api: unknown
): api is HasLastSavedChildState<SerializedState> => {
  return Boolean(
    api &&
      (api as HasLastSavedChildState).lastSavedStateForChild$ &&
      (api as HasLastSavedChildState).getLastSavedStateForChild
  );
};
