/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createMachine, InterpreterFrom } from 'xstate';
import {
  hasEmptyBottomChunk,
  hasEmptyTopChunk,
  hasLoadedBottomChunk,
  hasLoadedTopChunk,
  isWithinLoadedChunks,
} from './guards/chunk_guards';
import { updateFilters } from '../data_access_state_machine/actions/filters_actions';
import { appendNewBottomChunk, updateChunksFromLoadAfter } from './services/load_after_service';
import { updateChunksFromLoadAround } from './services/load_around_service';
import { prependNewTopChunk, updateChunksFromLoadBefore } from './services/load_before_service';
import { updateChunksFromLoadTail } from './services/load_tail_service';
import { updatePosition } from '../data_access_state_machine/actions/position_actions';
import { updateTimeRange } from '../data_access_state_machine/actions/time_range_actions';
import {
  areVisibleEntriesNearEnd,
  areVisibleEntriesNearStart,
} from './guards/visible_entry_guards';
import { EntriesMachineContext, EntriesMachineEvent, EntriesMachineState } from './types';
import { hasFullTopChunk, hasFullBottomChunk } from './guards/chunk_guards';

// for stubbing guards until all are implemented
const constantGuard =
  <Value extends unknown>(value: Value) =>
  () =>
    value;

export const entriesStateMachine = createMachine<
  EntriesMachineContext,
  EntriesMachineEvent,
  EntriesMachineState
>(
  {
    id: 'logExplorerEntries',
    initial: 'loadingAround',
    states: {
      loadingAround: {
        invoke: {
          src: 'loadAround',
          id: 'loadAround',
        },
        on: {
          loadAroundSucceeded: {
            actions: 'updateChunksFromLoadAround',
            target: 'loaded',
          },
          positionChanged: {
            actions: 'updatePosition',
            target: 'loadingAround',
            internal: false,
          },
          loadAroundFailed: {
            target: 'failedNoData',
          },
          timeRangeChanged: {
            actions: 'updateTimeRange',
            target: 'loadingAround',
            internal: false,
          },
          columnsChanged: {
            target: 'loadingAround',
            internal: false,
          },
        },
      },
      loaded: {
        type: 'parallel',
        states: {
          top: {
            initial: 'unknown',
            states: {
              unknown: {
                always: [
                  {
                    cond: 'hasLoadedTopChunk',
                    target: 'loaded',
                    internal: true,
                  },
                  {
                    cond: 'hasEmptyTopChunk',
                    target: 'empty',
                    internal: true,
                  },
                  {
                    target: 'failed',
                    internal: true,
                  },
                ],
              },
              failed: {
                on: {
                  retryTop: {
                    target: '#logExplorerEntries.extendingTop',
                  },
                },
              },
              loaded: {
                initial: 'unknown',
                states: {
                  unknown: {
                    always: [
                      {
                        cond: 'hasFullTopChunk',
                        target: 'full',
                        internal: true,
                      },
                      {
                        target: 'partial',
                        internal: true,
                      },
                    ],
                  },
                  full: {
                    on: {
                      visibleEntriesChanged: {
                        cond: 'areVisibleEntriesNearStart',
                        target: '#logExplorerEntries.loadingTop',
                      },
                    },
                  },
                  partial: {},
                },
              },
              empty: {},
            },
          },
          bottom: {
            initial: 'unknown',
            states: {
              unknown: {
                always: [
                  {
                    cond: 'hasLoadedBottomChunk',
                    target: 'loaded',
                    internal: true,
                  },
                  {
                    cond: 'hasEmptyBottomChunk',
                    target: 'empty',
                    internal: true,
                  },
                  {
                    target: 'failed',
                    internal: true,
                  },
                ],
              },
              failed: {
                on: {
                  retryBottom: {
                    target: '#logExplorerEntries.extendingBottom',
                  },
                },
              },
              loaded: {
                initial: 'unknown',
                states: {
                  unknown: {
                    always: [
                      {
                        cond: 'hasFullBottomChunk',
                        target: 'full',
                        internal: true,
                      },
                      {
                        target: 'partial',
                        internal: true,
                      },
                    ],
                  },
                  full: {
                    on: {
                      visibleEntriesChanged: {
                        cond: 'areVisibleEntriesNearEnd',
                        target: '#logExplorerEntries.loadingBottom',
                      },
                    },
                  },
                  partial: {},
                },
              },
              empty: {},
            },
          },
        },
        on: {
          positionChanged: [
            {
              actions: 'updatePosition',
              cond: 'isWithinLoadedChunks',
              target: undefined,
            },
            {
              actions: 'updatePosition',
              target: 'loadingAround',
            },
          ],
          timeRangeChanged: [
            {
              actions: 'updateTimeRange',
              cond: 'startTimestampExtendsLoadedTop',
              target: 'extendingTop',
            },
            {
              actions: 'updateTimeRange',
              cond: 'startTimestampReducesLoadedTop',
            },
            {
              actions: 'updateTimeRange',
              cond: 'endTimestampExtendsLoadedBottom',
              target: 'extendingBottom',
            },
            {
              actions: 'updateTimeRange',
              cond: 'endTimestampReducesLoadedBottom',
            },
            {
              actions: ['updateTimeRange', 'resetPosition'],
              target: 'loadingAround',
            },
          ],
          columnsChanged: {
            target: 'reloading',
          },
        },
      },
      failedNoData: {
        on: {
          positionChanged: {
            actions: 'updatePosition',
            target: 'loadingAround',
          },
          retry: {
            target: 'loadingAround',
          },
          filtersChanged: {
            actions: 'updateFilters',
            target: 'loadingAround',
          },
          timeRangeChanged: {
            actions: 'updateTimeRange',
            target: 'loadingAround',
          },
        },
      },
      loadingTop: {
        entry: 'prependNewTopChunk',
        invoke: {
          src: 'loadBefore',
          id: 'loadBefore',
        },
        on: {
          loadBeforeSucceeded: {
            actions: 'updateChunksFromLoadBefore',
            target: '#logExplorerEntries.loaded.top.loaded',
          },
          loadBeforeFailed: {
            actions: 'updateChunksFromLoadBefore',
            target: '#logExplorerEntries.loaded.top.failed',
          },
          columnsChanged: {
            target: 'reloading',
          },
        },
      },
      loadingBottom: {
        entry: 'appendNewBottomChunk',
        invoke: {
          src: 'loadAfter',
          id: 'loadAfter',
        },
        on: {
          loadAfterSucceeded: {
            actions: 'updateChunksFromLoadAfter',
            target: '#logExplorerEntries.loaded.bottom.loaded',
          },
          loadAfterFailed: {
            actions: 'updateChunksFromLoadAfter',
            target: '#logExplorerEntries.loaded.bottom.failed',
          },
          columnsChanged: {
            target: 'reloading',
          },
        },
      },
      extendingTop: {
        invoke: {
          src: 'extendTop',
          id: 'extendTop',
        },
        on: {
          extendTopSucceeded: {
            actions: 'updateChunksFromExtendTop',
            target: '#logExplorerEntries.loaded.top.loaded',
          },
          extendTopFailed: {
            actions: 'updateChunksFromExtendTop',
            target: '#logExplorerEntries.loaded.top.failed',
          },
          columnsChanged: {
            target: 'reloading',
          },
        },
      },
      extendingBottom: {
        invoke: {
          src: 'extendBottom',
          id: 'extendBottom',
        },
        on: {
          extendBottomSucceeded: {
            actions: 'updateChunksFromExtendBottom',
            target: '#logExplorerEntries.loaded.bottom.loaded',
          },
          extendBottomFailed: {
            actions: 'updateChunksFromExtendBottom',
            target: '#logExplorerEntries.loaded.bottom.failed',
          },
          columnsChanged: {
            target: 'reloading',
          },
        },
      },
      reloading: {
        type: 'parallel',
        states: {
          top: {
            initial: 'loading',
            states: {
              loading: {
                invoke: {
                  src: 'loadBefore',
                },
                on: {
                  loadBeforeSucceeded: {
                    actions: 'updateChunksFromLoadBefore',
                    target: 'loaded',
                  },
                  loadBeforeFailed: {
                    target: 'loaded',
                  },
                },
              },
              loaded: {
                type: 'final',
              },
            },
          },
          bottom: {
            initial: 'loading',
            states: {
              loading: {
                invoke: {
                  src: 'loadAfter',
                },
                on: {
                  loadAfterSucceeded: {
                    actions: 'updateChunksFromLoadAfter',
                    target: 'loaded',
                  },
                  loadAfterFailed: {
                    target: 'loaded',
                  },
                },
              },
              loaded: {
                type: 'final',
              },
            },
          },
        },
        onDone: [
          {
            cond: 'hasLoadedTopChunk',
            target: '#logExplorerEntries.loaded',
          },
          {
            cond: 'hasLoadedBottomChunk',
            target: '#logExplorerEntries.loaded',
          },
          {
            target: 'failedNoData',
          },
        ],
      },
      uninitialized: {
        on: {
          positionChanged: {
            actions: 'updatePosition',
            target: 'loadingAround',
          },
          timeRangeChanged: {
            actions: 'updateTimeRange',
            target: 'loadingAround',
          },
          columnsChanged: {
            target: 'loadingAround',
          },
          load: {
            target: 'loadingAround',
          },
        },
      },
      tailing: {
        initial: 'loading',
        states: {
          loading: {
            entry: 'updateTimeRange',
            invoke: {
              src: 'loadTail',
            },
            on: {
              loadTailSucceeded: {
                actions: 'updateChunksFromLoadTail',
                target: 'loaded',
              },
            },
          },
          loaded: {
            after: {
              loadTailDelay: {
                target: 'loading',
              },
            },
          },
        },
        on: {
          stopTailing: {
            target: 'loaded',
          },
        },
      },
    },
    on: {
      filtersChanged: {
        actions: 'updateFilters',
        target: 'loadingAround',
        internal: false,
      },
      dataViewChanged: {
        target: 'loadingAround',
        internal: false,
      },
      startTailing: {
        target: 'tailing',
        internal: false,
      },
    },
  },
  {
    actions: {
      updateChunksFromLoadAround,
      updateChunksFromLoadBefore,
      updateChunksFromLoadAfter,
      updateChunksFromLoadTail,
      updateFilters,
      updatePosition,
      updateTimeRange,
      prependNewTopChunk,
      appendNewBottomChunk,
    },
    guards: {
      areVisibleEntriesNearStart,
      areVisibleEntriesNearEnd,
      hasEmptyTopChunk,
      hasEmptyBottomChunk,
      hasLoadedTopChunk,
      hasLoadedBottomChunk,
      hasFullTopChunk,
      hasFullBottomChunk,
      isWithinLoadedChunks,
      startTimestampExtendsLoadedTop: constantGuard(false),
      startTimestampReducesLoadedTop: constantGuard(false),
      endTimestampExtendsLoadedBottom: constantGuard(false),
      endTimestampReducesLoadedBottom: constantGuard(false),
    },
  }
);

export type EntriesStateMachine = typeof entriesStateMachine;
export type EntriesService = InterpreterFrom<EntriesStateMachine>;
