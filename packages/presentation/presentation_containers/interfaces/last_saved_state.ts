/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishingSubject } from '@kbn/presentation-publishing';
import { BehaviorSubject, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { SerializedPanelState } from './serialized_state';

export interface PublishesLastSavedState {
  lastSavedState: Subject<void>; // a notification that the last saved state has changed
  getLastSavedStateForChild: (childId: string) => SerializedPanelState | undefined;
}

export const apiPublishesLastSavedState = (api: unknown): api is PublishesLastSavedState => {
  return Boolean(
    api &&
      (api as PublishesLastSavedState).lastSavedState &&
      (api as PublishesLastSavedState).getLastSavedStateForChild
  );
};

export const getLastSavedStateSubjectForChild = <StateType extends unknown = unknown>(
  parentApi: unknown,
  childId: string,
  deserializer?: (state: SerializedPanelState) => StateType
): PublishingSubject<StateType | undefined> | undefined => {
  if (!parentApi) return;
  const fetchLastSavedState = (): StateType | undefined => {
    if (!apiPublishesLastSavedState(parentApi)) return;
    const rawLastSavedState = parentApi.getLastSavedStateForChild(childId);
    if (rawLastSavedState === undefined) return;
    return deserializer
      ? deserializer(rawLastSavedState)
      : (rawLastSavedState.rawState as StateType);
  };

  const lastSavedStateForChild = new BehaviorSubject<StateType | undefined>(fetchLastSavedState());
  if (!apiPublishesLastSavedState(parentApi)) return;
  parentApi.lastSavedState
    .pipe(
      map(() => fetchLastSavedState()),
      filter((rawLastSavedState) => rawLastSavedState !== undefined)
    )
    .subscribe(lastSavedStateForChild);
  return lastSavedStateForChild;
};
