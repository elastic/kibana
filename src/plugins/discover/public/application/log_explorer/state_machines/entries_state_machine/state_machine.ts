/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createMachine, InterpreterFrom, Interpreter } from 'xstate';
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
import { ActorRefFromInterpreter } from '../data_access_state_machine';
import { requestMoreAfter, requestMoreBefore } from './actions/request_more_actions';
import {
  scrollAfterChunkBoundary,
  scrollBeforeChunkBoundary,
  scrollBeforeEnd,
} from './actions/scroll_actions';

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
            target: ['loaded.top', 'loaded.bottom', 'loaded.grid.staleAfterLoadAround'],
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
                      requestMoreBefore: {
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
                      requestMoreAfter: {
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
          grid: {
            initial: 'unknown',
            states: {
              unknown: {
                // always: [
                //     {
                //       cond: {
                //         type: 'isEvent',
                //         eventType: 'loadAfterSuccess',
                //       }
                //     }
                // ]
              },
              staleAfterLoadAround: {
                on: {
                  visibleEntriesChanged: [
                    {
                      actions: 'scrollAfterChunkBoundary',
                      target: 'waitingForSynchronization',
                      internal: true,
                    },
                  ],
                },
              },
              staleAfterLoadBefore: {
                on: {
                  visibleEntriesChanged: [
                    {
                      actions: 'scrollAfterChunkBoundary',
                      target: 'waitingForSynchronization',
                      internal: true,
                    },
                  ],
                },
              },
              staleAfterLoadAfter: {
                on: {
                  visibleEntriesChanged: [
                    {
                      actions: 'scrollBeforeChunkBoundary',
                      target: 'waitingForSynchronization',
                      internal: true,
                    },
                  ],
                },
              },
              waitingForSynchronization: {
                on: {
                  visibleEntriesChanged: [
                    {
                      target: 'synchronized',
                      internal: true,
                    },
                  ],
                },
              },
              synchronized: {
                on: {
                  visibleEntriesChanged: [
                    {
                      cond: 'areVisibleEntriesNearStart',
                      actions: ['requestMoreBefore'],
                    },
                    {
                      cond: 'areVisibleEntriesNearEnd',
                      actions: ['requestMoreAfter'],
                    },
                  ],
                },
              },
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
            target: ['loaded.top', 'loaded.grid.staleAfterLoadBefore'],
          },
          loadBeforeFailed: {
            actions: 'updateChunksFromLoadBefore',
            target: ['loaded.top.failed', 'loaded.grid.staleAfterLoadBefore'],
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
            target: ['loaded.bottom', 'loaded.grid.staleAfterLoadAfter'],
          },
          loadAfterFailed: {
            actions: 'updateChunksFromLoadAfter',
            target: ['loaded.bottom.failed', 'loaded.grid.staleAfterLoadAfter'],
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
            target: 'loaded.top.loaded',
          },
          extendTopFailed: {
            actions: 'updateChunksFromExtendTop',
            target: 'loaded.top.failed',
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
            target: ['loaded.top', 'loaded.bottom', 'loaded.grid.synchronized'],
          },
          {
            cond: 'hasLoadedBottomChunk',
            target: ['loaded.top', 'loaded.bottom', 'loaded.grid.synchronized'],
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
            initial: 'staleAfterLoadTail',
            after: {
              loadTailDelay: {
                actions: 'updateTimeRangeFromTimefilter',
                target: 'loading',
              },
            },
            states: {
              staleAfterLoadTail: {
                on: {
                  visibleEntriesChanged: [
                    {
                      actions: 'scrollBeforeEnd',
                      target: 'waitingForSynchronization',
                      internal: true,
                    },
                  ],
                },
              },
              waitingForSynchronization: {
                on: {
                  visibleEntriesChanged: [
                    {
                      target: 'synchronized',
                      internal: true,
                    },
                  ],
                },
              },
              synchronized: {},
            },
          },
        },
        on: {
          stopTailing: {
            target: ['loaded.top', 'loaded.bottom', 'loaded.grid.synchronized'],
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
      requestMoreBefore,
      requestMoreAfter,
      scrollAfterChunkBoundary,
      scrollBeforeChunkBoundary,
      scrollBeforeEnd,
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
export type EntriesActorRef = ActorRefFromInterpreter<
  Interpreter<EntriesMachineContext, {}, EntriesMachineEvent>
>;
