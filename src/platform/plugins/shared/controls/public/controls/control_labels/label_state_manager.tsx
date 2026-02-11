/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, map, skip, combineLatest } from 'rxjs';

import type { DataControlState } from '@kbn/controls-schemas';
import {
  titleComparators,
  type PublishingSubject,
  type SerializedTitles,
  type StateComparators,
} from '@kbn/presentation-publishing';
import type { SubjectsOf } from '@kbn/presentation-publishing/state_manager/types';

import type { ControlLabelStateManager } from './types';

/**
 * Controls handle their own label rendering, so we cannot rely on the normal titles manager because
 * the other properties (description, hide title, default title, etc.) are not applicable for controls.
 * For the API, we refer to this piece of state as `title` to avoid confusion across embeddable types;
 * however, for the UI, we refer to it as `label`
 */

export const defaultControlLabelComparators: StateComparators<Pick<DataControlState, 'title'>> = {
  title: titleComparators.title,
};

type PickStringsOnly<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

export const initializeLabelManager = <
  StateType extends Pick<SerializedTitles, 'title'> = Pick<SerializedTitles, 'title'>
>(
  state: StateType,
  api: SubjectsOf<Omit<StateType, 'title'>>,
  defaultLabelKey: keyof Required<Omit<PickStringsOnly<StateType>, 'title'>> // only strings can be used as the default label
): ControlLabelStateManager => {
  const label$ = new BehaviorSubject<string | undefined>(state.title);
  const defaultLabel$ = api[
    `${defaultLabelKey as string}$` as keyof SubjectsOf<Omit<StateType, 'title'>>
  ] as PublishingSubject<string>; // guaranteed to be a string by TypeScript due to type of `defaultLabelKey`

  const visibleLabel$ = new BehaviorSubject<string>(state.title || defaultLabel$.getValue());
  const visibleLabelSubscription = combineLatest([label$, defaultLabel$])
    .pipe(skip(1))
    .subscribe(([title, defaultLabel]) => {
      visibleLabel$.next(title || defaultLabel);
    });

  return {
    api: {
      label$: visibleLabel$,
      defaultLabel$,
      setLabel: (newLabel: string | undefined) => {
        label$.next(newLabel);
      },
    },
    anyStateChange$: label$.pipe(map(() => undefined)),
    getLatestState: () => ({
      title: label$.getValue(),
    }),
    reinitializeState: (newState) => {
      label$.next(newState?.title);
    },
  };
};
