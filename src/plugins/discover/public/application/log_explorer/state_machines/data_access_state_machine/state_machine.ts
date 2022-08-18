/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createMachine, InterpreterFrom } from 'xstate';
import { updateFilters } from './actions/filters_actions';
import { updateTimeRange } from './actions/time_range_actions';
import { DataAccessMachineContext, DataAccessMachineState, DataAccessMachineEvent } from './types';

export const dataAccessStateMachine = createMachine<
  DataAccessMachineContext,
  DataAccessMachineEvent,
  DataAccessMachineState
>(
  {
    id: 'logExplorerData',
    initial: 'uninitialized',
    states: {
      uninitialized: {},
      initialized: {},
    },
    on: {
      timeRangeChanged: {
        actions: 'updateTimeRange',
        target: 'initialized',
      },
      filtersChanged: {
        actions: 'updateFilters',
        target: 'initialized',
        internal: false,
      },
      dataViewChanged: {
        target: 'initialized',
        internal: false,
      },
    },
  },
  {
    actions: {
      updateFilters,
      updateTimeRange,
    },
    guards: {},
  }
);

export type DataAccessStateMachine = typeof dataAccessStateMachine;
export type DataAccessService = InterpreterFrom<DataAccessStateMachine>;
