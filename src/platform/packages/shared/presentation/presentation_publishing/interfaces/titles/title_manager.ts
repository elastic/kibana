/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { StateComparators } from '../../state_manager';
import { PublishesWritableDescription } from './publishes_description';
import { PublishesWritableTitle } from './publishes_title';

export interface SerializedTitles {
  title?: string;
  description?: string;
  hidePanelTitles?: boolean;
}
// SERIALIZED STATE ONLY TODO remove this after state manager is created.
type WithAllKeys<T extends object> = { [Key in keyof Required<T>]: T[Key] };

export const defaultTitlesState: WithAllKeys<SerializedTitles> = {
  title: undefined,
  description: undefined,
  hidePanelTitles: false,
};

export const stateHasTitles = (state: unknown): state is SerializedTitles => {
  return (
    (state as SerializedTitles)?.title !== undefined ||
    (state as SerializedTitles)?.description !== undefined ||
    (state as SerializedTitles)?.hidePanelTitles !== undefined
  );
};

export interface TitlesApi extends PublishesWritableTitle, PublishesWritableDescription {}

export const initializeTitleManager = (
  rawState: SerializedTitles
): {
  api: TitlesApi;
  comparators: StateComparators<SerializedTitles>;
  serialize: () => SerializedTitles;
} => {
  const initialState = { ...defaultTitlesState, ...rawState };

  const title$ = new BehaviorSubject<string | undefined>(initialState.title);
  const description$ = new BehaviorSubject<string | undefined>(initialState.description);
  const hideTitle$ = new BehaviorSubject<boolean | undefined>(initialState.hidePanelTitles);

  const setTitle = (value: string | undefined) => {
    if (value !== title$.value) title$.next(value);
  };
  const setHideTitle = (value: boolean | undefined) => {
    if (value !== hideTitle$.value) hideTitle$.next(value);
  };
  const setDescription = (value: string | undefined) => {
    if (value !== description$.value) description$.next(value);
  };

  return {
    api: {
      title$,
      hideTitle$,
      description$,
      setTitle,
      setHideTitle,
      setDescription,
    },
    comparators: {
      title: 'referenceEquality',
      description: 'referenceEquality',
      hidePanelTitles: 'referenceEquality',
    } as StateComparators<SerializedTitles>,
    serialize: () => ({
      title: title$.value,
      hidePanelTitles: hideTitle$.value,
      description: description$.value,
    }),
  };
};
