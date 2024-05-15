/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlWidth } from '@kbn/controls-plugin/common';
import { StateComparators } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { ControlGroupApi } from './control_group/types';
import { ControlApiRegistration, DefaultControlApi, DefaultControlState } from './types';

type DefaultControlStateManager = {
  [key in keyof Required<DefaultControlState>]: BehaviorSubject<DefaultControlState[key]>;
};

export const initializeDefaultControlApi = (
  controlGroup: ControlGroupApi,
  state: DefaultControlState
): {
  defaultControlStateManager: DefaultControlStateManager;
  defaultControlApi: ControlApiRegistration<DefaultControlApi>;
  defaultControlComparators: StateComparators<DefaultControlState>;
} => {
  const dataLoading = new BehaviorSubject<boolean | undefined>(false);
  const blockingError = new BehaviorSubject<Error | undefined>(undefined);
  const grow = new BehaviorSubject<boolean | undefined>(state.grow);
  const width = new BehaviorSubject<ControlWidth | undefined>(state.width);

  const defaultControlApi: ControlApiRegistration<DefaultControlApi> = {
    grow,
    width,
    dataLoading,
    blockingError,
    setDataLoading: (loading) => dataLoading.next(loading),
  };

  const defaultControlStateManager = {
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
  };
};
