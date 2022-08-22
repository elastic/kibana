/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createMachine, InterpreterFrom, send, assign, spawn } from 'xstate';
import { DataAccessMachineContext, DataAccessMachineState, DataAccessMachineEvent } from './types';
import { entriesStateMachine } from '../entries_state_machine';
import { histogramStateMachine } from '../histogram_state_machine';

export const dataAccessStateMachine = createMachine<
  DataAccessMachineContext,
  DataAccessMachineEvent,
  DataAccessMachineState
>(
  {
    id: 'logExplorerData',
    initial: 'uninitialized',
    states: {
      uninitialized: {
        on: {
          initialize: {
            actions: [
              assign({
                entries: (context, event) => {
                  const { initialEntriesContext, initialEntriesServices, initialEntriesDelays } =
                    event; // TODO: type these properly in events
                  return spawn(
                    entriesStateMachine.withContext(initialEntriesContext).withConfig({
                      services: initialEntriesServices,
                      delays: initialEntriesDelays,
                    })
                  );
                },
                histogram: (context, event) => {
                  const { initialHistogramContext, initialHistogramServices } = event; // TODO: type these properly in events
                  return spawn(
                    histogramStateMachine.withContext(initialHistogramContext).withConfig({
                      services: initialHistogramServices,
                    })
                  );
                },
              }),
            ],
            target: 'initialized',
          },
        },
      },
      initialized: {
        on: {
          timeRangeChanged: {
            actions: [
              send((context, event) => ({ ...event, type: 'updateTimeRange' }), {
                to: (context) => context.entries,
              }),
              send((context, event) => ({ ...event, type: 'updateTimeRange' }), {
                to: (context) => context.histogram,
              }),
            ],
          },
          filtersChanged: {
            actions: [
              send((context, event) => ({ ...event, type: 'updateFilters' }), {
                to: (context) => context.entries,
              }),
              send((context, event) => ({ ...event, type: 'updateFilters' }), {
                to: (context) => context.histogram,
              }),
            ],
            internal: false,
          },
          dataViewChanged: {
            actions: [
              send((context, event) => ({ ...event, type: 'dataViewChanged' }), {
                to: (context) => context.entries,
              }),
              send((context, event) => ({ ...event, type: 'dataViewChanged' }), {
                to: (context) => context.histogram,
              }),
            ],
            internal: false,
          },
          startTailing: {
            actions: [
              send(
                { type: 'startTailing' },
                {
                  to: (context) => context.entries,
                }
              ),
            ],
          },
          stopTailing: {
            actions: [
              send(
                { type: 'stopTailing' },
                {
                  to: (context) => context.entries,
                }
              ),
            ],
          },
        },
      },
    },
  },
  {
    actions: {},
    guards: {},
  }
);

export type DataAccessStateMachine = typeof dataAccessStateMachine;
export type DataAccessService = InterpreterFrom<DataAccessStateMachine>;
