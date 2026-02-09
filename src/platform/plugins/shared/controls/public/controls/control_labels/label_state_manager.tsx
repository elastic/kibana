/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, map } from 'rxjs';

import type { DataControlState } from '@kbn/controls-schemas';
import {
  titleComparators,
  type SerializedTitles,
  type StateComparators,
} from '@kbn/presentation-publishing';

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

export const initializeLabelManager = (state: SerializedTitles): ControlLabelStateManager => {
  const label$ = new BehaviorSubject<string | undefined>(state.title);

  return {
    api: {
      label$,
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
