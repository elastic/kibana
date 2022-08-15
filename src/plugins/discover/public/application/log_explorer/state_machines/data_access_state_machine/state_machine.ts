/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { assign, createMachine, InterpreterFrom } from 'xstate';
import {
  hasEmptyBottomChunk,
  hasEmptyTopChunk,
  hasLoadedBottomChunk,
  hasLoadedTopChunk,
} from './chunk_guards';
import { updateFilters } from './filters_actions';
import { appendNewBottomChunk, updateChunksFromLoadAfter } from './load_after_service';
import { updateChunksFromLoadAround } from './load_around_service';
import { prependNewTopChunk, updateChunksFromLoadBefore } from './load_before_service';
import { updateChunksFromLoadTail } from './load_tail_service';
import { updateTimeRange } from './time_range_actions';
import { LogExplorerContext, LogExplorerEvent, LogExplorerState } from './types';
import { areVisibleEntriesNearEnd, areVisibleEntriesNearStart } from './visible_entry_guards';

// for stubbing guards until all are implemented
const constantGuard =
  <Value extends unknown>(value: Value) =>
  () =>
    value;

export const dataAccessStateMachine = createMachine<
  LogExplorerContext,
  LogExplorerEvent,
  LogExplorerState
>(
  {
    id: 'logExplorerData',
    initial: 'uninitialized',
    states: {
      loadingAround: {
        entry: 'resetChunks',
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
            target: 'loadingAround',
            internal: false,
          },
          loadAroundFailed: {
            target: 'failedNoData',
          },
          timeRangeChanged: {
            actions: 'updateTimeRange',
          },
          columnsChanged: {},
        },
      },
      loaded: {
        type: 'parallel',
        states: {
          top: {
            initial: 'start',
            states: {
              start: {
                always: [
                  {
                    cond: 'hasLoadedTopChunk',
                    target: 'loaded',
                  },
                  {
                    cond: 'hasEmptyTopChunk',
                    target: 'empty',
                  },
                  {
                    target: 'failed',
                  },
                ],
              },
              failed: {
                on: {
                  retryTop: {
                    target: '#logExplorerData.extendingTop',
                  },
                },
              },
              loaded: {
                on: {
                  positionChanged: {
                    cond: 'isPositionNearStart',
                    target: '#logExplorerData.loadingTop',
                  },
                  visibleEntriesChanged: {
                    cond: 'areVisibleEntriesNearStart',
                    target: '#logExplorerData.loadingTop',
                  },
                },
              },
              empty: {},
            },
          },
          bottom: {
            initial: 'start',
            states: {
              start: {
                always: [
                  {
                    cond: 'hasLoadedBottomChunk',
                    target: 'loaded',
                  },
                  {
                    cond: 'hasEmptyBottomChunk',
                    target: 'empty',
                  },
                  {
                    target: 'failed',
                  },
                ],
              },
              failed: {
                on: {
                  retryBottom: {
                    target: '#logExplorerData.extendingBottom',
                  },
                },
              },
              loaded: {
                on: {
                  positionChanged: {
                    cond: 'isPositionNearEnd',
                    target: '#logExplorerData.loadingBottom',
                  },
                  visibleEntriesChanged: {
                    cond: 'areVisibleEntriesNearEnd',
                    target: '#logExplorerData.loadingBottom',
                  },
                },
              },
              empty: {},
            },
          },
        },
        on: {
          positionChanged: {
            cond: '!isWithinLoadedChunks',
            target: 'loadingAround',
          },
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
              actions: 'resetPosition',
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
            target: '#logExplorerData.loaded.top.loaded',
          },
          loadBeforeFailed: {
            actions: 'updateChunksFromLoadBefore',
            target: '#logExplorerData.loaded.top.failed',
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
            target: '#logExplorerData.loaded.bottom.loaded',
          },
          loadAfterFailed: {
            actions: 'updateChunksFromLoadAfter',
            target: '#logExplorerData.loaded.bottom.failed',
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
            target: '#logExplorerData.loaded.top.loaded',
          },
          extendTopFailed: {
            actions: 'updateChunksFromExtendTop',
            target: '#logExplorerData.loaded.top.failed',
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
            target: '#logExplorerData.loaded.bottom.loaded',
          },
          extendBottomFailed: {
            actions: 'updateChunksFromExtendBottom',
            target: '#logExplorerData.loaded.bottom.failed',
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
            target: '#logExplorerData.loaded',
          },
          {
            cond: 'hasLoadedBottomChunk',
            target: '#logExplorerData.loaded',
          },
          {
            target: 'failedNoData',
          },
        ],
      },
      uninitialized: {
        on: {
          positionChanged: {
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
        target: '.loadingAround',
        internal: false,
      },
      dataViewChanged: {
        target: '.loadingAround',
        internal: false,
      },
      startTailing: {
        target: '.tailing',
        internal: false,
      },
      startedReload: {
        target: '.reloading',
        internal: false,
      },
    },
  },
  {
    actions: {
      resetChunks: assign((context) => ({
        ...context,
        topChunk: {
          status: 'uninitialized' as const,
        },
        bottomChunk: {
          status: 'uninitialized' as const,
        },
      })),
      updateChunksFromLoadAround,
      updateChunksFromLoadBefore,
      updateChunksFromLoadAfter,
      updateChunksFromLoadTail,
      updateFilters,
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
      isPositionNearStart: constantGuard(false),
      isPositionNearEnd: constantGuard(false),
      startTimestampExtendsLoadedTop: constantGuard(false),
      startTimestampReducesLoadedTop: constantGuard(false),
      endTimestampExtendsLoadedBottom: constantGuard(false),
      endTimestampReducesLoadedBottom: constantGuard(false),
    },
  }
);

export type DataAccessStateMachine = typeof dataAccessStateMachine;
export type DataAccessService = InterpreterFrom<DataAccessStateMachine>;
