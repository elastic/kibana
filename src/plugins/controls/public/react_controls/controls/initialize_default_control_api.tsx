/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import { SerializedPanelState } from '@kbn/presentation-containers';
import { StateComparators } from '@kbn/presentation-publishing';
import { ControlWidth } from '../../../common';

import {
  ControlApiInitialization,
  ControlStateManager,
  DefaultControlApi,
  DefaultControlState,
} from './types';

export type ControlApi = ControlApiInitialization<DefaultControlApi>;

export const initializeDefaultControlApi = (
  state: DefaultControlState
): {
  api: ControlApi;
  stateManager: ControlStateManager<DefaultControlState>;
  comparators: StateComparators<DefaultControlState>;
  serialize: () => SerializedPanelState<DefaultControlState>;
} => {
  const dataLoading = new BehaviorSubject<boolean | undefined>(false);
  const blockingError = new BehaviorSubject<Error | undefined>(undefined);
  const grow = new BehaviorSubject<boolean | undefined>(state.grow);
  const width = new BehaviorSubject<ControlWidth | undefined>(state.width);

  return {
    api: {
      grow,
      width,
      dataLoading,
      blockingError,
      setBlockingError: (error) => blockingError.next(error),
      setDataLoading: (loading) => dataLoading.next(loading),
    },
    comparators: {
      grow: [grow, (newGrow: boolean | undefined) => grow.next(newGrow)],
      width: [width, (newWidth: ControlWidth | undefined) => width.next(newWidth)],
    },
    stateManager: {
      grow,
      width,
    },
    serialize: () => {
      return { rawState: { grow: grow.getValue(), width: width.getValue() }, references: [] };
    },
  };
};
