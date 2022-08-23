/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createMachine, InterpreterFrom, Interpreter } from 'xstate';
import { updateFilters } from '../data_access_state_machine/actions/filters_actions';
import { updateTimeRange } from '../data_access_state_machine/actions/time_range_actions';
import { updateHistogram } from './services/load_histogram_service';
import { HistogramMachineContext, HistogramMachineEvent, HistogramMachineState } from './types';
import { ActorRefFromInterpreter } from '../data_access_state_machine';

export const histogramStateMachine = createMachine<
  HistogramMachineContext,
  HistogramMachineEvent,
  HistogramMachineState
>(
  {
    id: 'logExplorerHistogram',
    initial: 'loading',
    states: {
      loading: {
        invoke: {
          src: 'loadHistogram',
          id: 'loadHistogram',
        },
        on: {
          loadHistogramSucceeded: {
            actions: 'updateHistogram',
            target: 'loaded',
          },
          loadHistogramFailed: {},
        },
      },
      loaded: {
        on: {
          timeRangeChanged: {
            actions: 'updateTimeRange',
            target: 'loading',
          },
          columnsChanged: {
            target: 'loading',
          },
        },
      },
    },
    on: {
      filtersChanged: {
        actions: 'updateFilters',
        target: 'loading',
        internal: false,
      },
      dataViewChanged: {
        target: 'loading',
        internal: false,
      },
    },
  },
  {
    actions: {
      updateFilters,
      updateTimeRange,
      updateHistogram,
    },
    guards: {},
  }
);

export type HistogramStateMachine = typeof histogramStateMachine;
export type HistogramService = InterpreterFrom<HistogramStateMachine>;
export type HistogramActorRef = ActorRefFromInterpreter<
  Interpreter<HistogramMachineContext, {}, HistogramMachineEvent>
>;
