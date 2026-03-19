/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map } from 'rxjs';

import type { DataControlState } from '@kbn/controls-schemas';
import {
  titleComparators,
  type PublishingSubject,
  type SerializedTitles,
  type StateComparators,
} from '@kbn/presentation-publishing';
import type { StateManager, SubjectsOf } from '@kbn/presentation-publishing/state_manager/types';

/**
 * Controls handle their own label rendering, so we cannot rely on the normal titles manager because
 * the other properties (description, hide title, default title, etc.) are not applicable for controls.
 */

export const defaultControlLabelComparators: StateComparators<Pick<DataControlState, 'title'>> = {
  title: titleComparators.title,
};

type PickStringsOnly<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

type ControlTitleState = Pick<SerializedTitles, 'title'>;

export const initializeLabelManager = <StateType extends ControlTitleState = ControlTitleState>(
  state: StateType,
  api: SubjectsOf<Omit<StateType, 'title'>>,
  defaultLabelKey: keyof Required<Omit<PickStringsOnly<StateType>, 'title'>> // only strings can be used as the default label
): StateManager<ControlTitleState> & {
  api: StateManager<ControlTitleState>['api'] & {
    defaultTitle$: PublishingSubject<string | undefined>;
    hideTitle$: PublishingSubject<boolean | undefined>;
    label$: PublishingSubject<string>;
  };
  cleanup: () => void;
} => {
  const title$ = new BehaviorSubject<string | undefined>(state.title);
  const defaultTitle$ = api[
    `${defaultLabelKey as string}$` as keyof SubjectsOf<Omit<StateType, 'title'>>
  ] as PublishingSubject<string>; // guaranteed to be a string by TypeScript due to type of `defaultLabelKey`

  const label$ = new BehaviorSubject<string>(state.title || defaultTitle$.getValue());
  const labelSubscription = combineLatest([title$, defaultTitle$])
    .pipe(distinctUntilChanged(deepEqual))
    .subscribe(([title, defaultTitle]) => {
      label$.next(title || defaultTitle);
    });

  return {
    api: {
      title$,
      hideTitle$: new BehaviorSubject<boolean | undefined>(true), // controls handle their own title rendering
      defaultTitle$: defaultTitle$ as PublishingSubject<string | undefined>, // aligns with expected type of defaultTitle$
      setTitle: (newTitle: string | undefined) => {
        title$.next(newTitle);
      },
      label$,
    },
    anyStateChange$: label$.pipe(map(() => undefined)),
    getLatestState: () => ({
      title: title$.getValue(),
    }),
    reinitializeState: (newState) => {
      title$.next(newState?.title);
    },
    cleanup: () => {
      labelSubscription.unsubscribe();
    },
  };
};
