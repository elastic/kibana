/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Observable, map, merge } from 'rxjs';
import { StateComparators, SerializedPanelState } from '@kbn/presentation-publishing';

import type { ControlWidth, DefaultControlState } from '../../common';
import type { ControlApiInitialization, ControlStateManager, DefaultControlApi } from './types';

export type ControlApi = ControlApiInitialization<DefaultControlApi>;

export const defaultControlComparators: StateComparators<DefaultControlState> = {
  grow: 'referenceEquality',
  width: 'referenceEquality',
};

export const initializeDefaultControlApi = (
  state: DefaultControlState
): {
  api: Omit<ControlApi, 'hasUnsavedChanges$' | 'resetUnsavedChanges'>;
  stateManager: ControlStateManager<DefaultControlState>;
  anyStateChange$: Observable<void>;
  getLatestState: () => SerializedPanelState<DefaultControlState>;
  reinitializeState: (lastSaved?: DefaultControlState) => void;
} => {
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);
  const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
  const grow = new BehaviorSubject<boolean | undefined>(state.grow);
  const width = new BehaviorSubject<ControlWidth | undefined>(state.width);

  return {
    api: {
      grow,
      width,
      dataLoading$,
      blockingError$,
      setBlockingError: (error) => blockingError$.next(error),
      setDataLoading: (loading) => dataLoading$.next(loading),
    },
    anyStateChange$: merge(grow, width).pipe(map(() => undefined)),
    stateManager: {
      grow,
      width,
    },
    getLatestState: () => {
      return { rawState: { grow: grow.getValue(), width: width.getValue() }, references: [] };
    },
    reinitializeState: (lastSaved?: DefaultControlState) => {
      grow.next(lastSaved?.grow);
      width.next(lastSaved?.width);
    },
  };
};
