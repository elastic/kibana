/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishingSubject } from '@kbn/presentation-publishing';
import { BehaviorSubject, Subject } from 'rxjs';
import { filter, map } from 'rxjs';
import { SerializedPanelState } from './serialized_state';

export interface PublishesLastSavedState<SerializedState extends object = object> {
  lastSavedState: Subject<void>; // a notification that the last saved state has changed
  getLastSavedStateForChild: (childId: string) => SerializedPanelState<SerializedState> | undefined;
}

export const apiPublishesLastSavedState = <SerializedState extends object = object>(
  api: unknown
): api is PublishesLastSavedState<SerializedState> => {
  return Boolean(
    api &&
      (api as PublishesLastSavedState).lastSavedState &&
      (api as PublishesLastSavedState).getLastSavedStateForChild
  );
};

export const getLastSavedStateSubjectForChild = <
  SerializedState extends object = object,
  RuntimeState extends object = SerializedState
>(
  parentApi: unknown,
  childId: string,
  deserializer: (state: SerializedPanelState<SerializedState>) => RuntimeState
): PublishingSubject<RuntimeState | undefined> | undefined => {
  if (!parentApi) return;
  const fetchLastSavedState = (): RuntimeState | undefined => {
    if (!apiPublishesLastSavedState<SerializedState>(parentApi)) return;
    const rawLastSavedState = parentApi.getLastSavedStateForChild(childId);
    if (rawLastSavedState === undefined) return;
    return deserializer(rawLastSavedState);
  };

  const lastSavedStateForChild = new BehaviorSubject<RuntimeState | undefined>(
    fetchLastSavedState()
  );
  if (!apiPublishesLastSavedState(parentApi)) return;
  parentApi.lastSavedState
    .pipe(
      map(() => fetchLastSavedState()),
      filter((rawLastSavedState) => rawLastSavedState !== undefined)
    )
    .subscribe(lastSavedStateForChild);
  return lastSavedStateForChild;
};
