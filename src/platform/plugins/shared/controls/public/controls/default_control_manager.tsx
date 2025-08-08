/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { StateComparators } from '@kbn/presentation-publishing';

import { initializeStateManager } from '@kbn/presentation-publishing/state_manager';
import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-constants';
import { BehaviorSubject } from 'rxjs';
import type { ControlWidth } from '@kbn/controls-schemas';
import type { DefaultControlState } from '../../common';
import type { ControlApiInitialization, DefaultControlApi } from './types';

export type ControlApi = ControlApiInitialization<DefaultControlApi>;

export const defaultControlComparators: StateComparators<DefaultControlState> = {
  grow: 'referenceEquality',
  width: 'referenceEquality',
};

export const defaultControlDefaultValues = {
  grow: DEFAULT_CONTROL_GROW,
  width: DEFAULT_CONTROL_WIDTH as ControlWidth,
};

export const initializeDefaultControlManager = (state: DefaultControlState) => {
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);
  const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
  const stateManager = initializeStateManager<DefaultControlState>(
    state,
    defaultControlDefaultValues
  );
  return {
    ...stateManager,
    api: {
      ...stateManager.api,
      dataLoading$,
      blockingError$,
      setBlockingError: (error: Error | undefined) => blockingError$.next(error),
      setDataLoading: (loading: boolean | undefined) => dataLoading$.next(loading),
    },
  };
};
