/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';

import { ControlWidth } from '@kbn/controls-plugin/common';
import { SerializedPanelState } from '@kbn/presentation-containers';
import { StateComparators } from '@kbn/presentation-publishing';

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
  defaultControlApi: ControlApi;
  defaultControlStateManager: ControlStateManager<DefaultControlState>;
  defaultControlComparators: StateComparators<DefaultControlState>;
  serializeDefaultControl: () => SerializedPanelState<DefaultControlState>;
} => {
  const dataLoading = new BehaviorSubject<boolean | undefined>(false);
  const blockingError = new BehaviorSubject<Error | undefined>(undefined);
  const grow = new BehaviorSubject<boolean | undefined>(state.grow);
  const width = new BehaviorSubject<ControlWidth | undefined>(state.width);

  const defaultControlApi: ControlApi = {
    grow,
    width,
    dataLoading,
    blockingError,
    setBlockingError: (error) => blockingError.next(error),
    setDataLoading: (loading) => dataLoading.next(loading),
  };

  const defaultControlStateManager: ControlStateManager<DefaultControlState> = {
    grow,
    width,
  };

  const defaultControlComparators: StateComparators<DefaultControlState> = {
    grow: [grow, (newGrow: boolean | undefined) => grow.next(newGrow)],
    width: [width, (newWidth: ControlWidth | undefined) => width.next(newWidth)],
  };

  return {
    defaultControlApi,
    defaultControlComparators,
    defaultControlStateManager,
    serializeDefaultControl: () => {
      return { rawState: { grow: grow.getValue(), width: width.getValue() }, references: [] };
    },
  };
};
