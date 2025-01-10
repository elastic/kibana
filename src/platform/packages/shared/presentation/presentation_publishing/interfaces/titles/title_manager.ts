/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { StateComparators } from '../../comparators';
import { PublishesWritableDescription } from './publishes_description';
import { PublishesWritableTitle } from './publishes_title';

export interface SerializedTitles {
  title?: string;
  description?: string;
  hidePanelTitles?: boolean;
}

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
  const title$ = new BehaviorSubject<string | undefined>(rawState.title);
  const description$ = new BehaviorSubject<string | undefined>(rawState.description);
  const hideTitle$ = new BehaviorSubject<boolean | undefined>(rawState.hidePanelTitles);

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
      setTitle,
      setHideTitle,
      description$,
      setDescription,
    },
    comparators: {
      title: [title$, setTitle],
      description: [description$, setDescription],
      hidePanelTitles: [hideTitle$, setHideTitle, (a, b) => Boolean(a) === Boolean(b)],
    } as StateComparators<SerializedTitles>,
    serialize: () => ({
      title: title$.value,
      hidePanelTitles: hideTitle$.value,
      description: description$.value,
    }),
  };
};
