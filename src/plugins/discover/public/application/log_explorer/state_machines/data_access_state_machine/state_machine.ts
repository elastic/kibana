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
  isWithinLoadedChunks,
} from './chunk_guards';
import { updateFilters } from './filters_actions';
import { appendNewBottomChunk, updateChunksFromLoadAfter } from './load_after_service';
import { updateChunksFromLoadAround } from './load_around_service';
import { prependNewTopChunk, updateChunksFromLoadBefore } from './load_before_service';
import { updateChunksFromLoadTail } from './load_tail_service';
import { updatePosition } from './position_actions';
import { updateTimeRange } from './time_range_actions';
import { LogExplorerContext, LogExplorerEvent, LogExplorerState } from './types';
import { areVisibleEntriesNearEnd, areVisibleEntriesNearStart } from './visible_entry_guards';
import { updateHistogram } from './load_histogram_service';

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
    type: 'parallel',
    states: {
      documents: {
        id: 'logExplorerDocuments',
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
                actions: 'updatePosition',
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
                        target: '#logExplorerDocuments.extendingTop',
                      },
                    },
                  },
                  loaded: {
                    on: {
                      visibleEntriesChanged: {
                        cond: 'areVisibleEntriesNearStart',
                        target: '#logExplorerDocuments.loadingTop',
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
                        target: '#logExplorerDocuments.extendingBottom',
                      },
                    },
                  },
                  loaded: {
                    on: {
                      visibleEntriesChanged: {
                        cond: 'areVisibleEntriesNearEnd',
                        target: '#logExplorerDocuments.loadingBottom',
                      },
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
                target: '#logExplorerDocuments.loaded.top.loaded',
              },
              loadBeforeFailed: {
                actions: 'updateChunksFromLoadBefore',
                target: '#logExplorerDocuments.loaded.top.failed',
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
                target: '#logExplorerDocuments.loaded.bottom.loaded',
              },
              loadAfterFailed: {
                actions: 'updateChunksFromLoadAfter',
                target: '#logExplorerDocuments.loaded.bottom.failed',
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
                target: '#logExplorerDocuments.loaded.top.loaded',
              },
              extendTopFailed: {
                actions: 'updateChunksFromExtendTop',
                target: '#logExplorerDocuments.loaded.top.failed',
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
                target: '#logExplorerDocuments.loaded.bottom.loaded',
              },
              extendBottomFailed: {
                actions: 'updateChunksFromExtendBottom',
                target: '#logExplorerDocuments.loaded.bottom.failed',
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
                target: '#logExplorerDocuments.loaded',
              },
              {
                cond: 'hasLoadedBottomChunk',
                target: '#logExplorerDocuments.loaded',
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
      },
      histogram: {
        id: 'logExplorerHistogram',
        initial: 'uninitialized',
        states: {
          uninitialized: {
            on: {
              timeRangeChanged: {
                actions: 'updateTimeRange',
                target: 'loading',
              },
              columnsChanged: {
                target: 'loading',
              },
              load: {
                target: 'loading',
              },
            },
          },
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
      },
    },
    on: {
      filtersChanged: {
        actions: 'updateFilters',
        target: ['#logExplorerDocuments.loadingAround', '#logExplorerHistogram.loading'],
        internal: false,
      },
      dataViewChanged: {
        target: ['#logExplorerDocuments.loadingAround', '#logExplorerHistogram.loading'],
        internal: false,
      },
      startTailing: {
        target: ['#logExplorerDocuments.tailing', '#logExplorerHistogram.loading'], // TODO: histogram tailing
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
      updatePosition,
      updateTimeRange,
      prependNewTopChunk,
      appendNewBottomChunk,
      updateHistogram,
    },
    guards: {
      areVisibleEntriesNearStart,
      areVisibleEntriesNearEnd,
      hasEmptyTopChunk,
      hasEmptyBottomChunk,
      hasLoadedTopChunk,
      hasLoadedBottomChunk,
      isWithinLoadedChunks,
      startTimestampExtendsLoadedTop: constantGuard(false),
      startTimestampReducesLoadedTop: constantGuard(false),
      endTimestampExtendsLoadedBottom: constantGuard(false),
      endTimestampReducesLoadedBottom: constantGuard(false),
    },
  }
);

export type DataAccessStateMachine = typeof dataAccessStateMachine;
export type DataAccessService = InterpreterFrom<DataAccessStateMachine>;
