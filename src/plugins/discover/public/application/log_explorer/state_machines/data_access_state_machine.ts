/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { createMachine, InterpreterFrom } from 'xstate';
import { LogExplorerChunk, LogExplorerPosition } from '../types';
import { LoadAroundEvent } from './services/load_around';

export interface LogExplorerContext {
  dataView: DataView;
  timeRange: TimeRange;
  position: LogExplorerPosition;
  topChunk: LogExplorerChunk;
  bottomChunk: LogExplorerChunk;
}

export type LogExplorerExternalEvent =
  | {
      type: 'columnsChanged';
      columns: string[];
    }
  | {
      type: 'timeRangeChanged';
      timeRange: TimeRange;
    }
  | {
      type: 'filtersChanged';
    }
  | {
      type: 'dataViewChanged';
      dataView: DataView;
    }
  | {
      type: 'positionChanged';
      position: LogExplorerPosition;
    };

export type LogExplorerInternalEvent =
  | {
      type: 'retry';
    }
  | {
      type: 'retryBottom';
    }
  | {
      type: 'retryTop';
    }
  | LoadAroundEvent
  | {
      // the following event types will be moved to their respective services
      // once these exist
      type: 'loadTopSucceeded';
    }
  | {
      type: 'loadTopFailed';
    }
  | {
      type: 'loadBottomSucceeded';
    }
  | {
      type: 'loadBottomFailed';
    }
  | {
      type: 'extendTopSucceeded';
    }
  | {
      type: 'extendTopFailed';
    }
  | {
      type: 'extendBottomSucceeded';
    }
  | {
      type: 'extendBottomFailed';
    }
  | {
      type: 'reloadSucceeded';
    }
  | {
      type: 'reloadFailed';
    };

export type LogExplorerEvent = LogExplorerExternalEvent | LogExplorerInternalEvent;

export const dataAccessStateMachine = createMachine({
  schema: {
    context: {} as LogExplorerContext,
    events: {} as LogExplorerEvent,
  },
  id: 'logExplorerData',
  initial: 'loadingAround',
  states: {
    loadingAround: {
      entry: 'resetChunks',
      invoke: {
        src: 'loadAround',
        id: 'loadAround',
      },
      on: {
        loadAroundSucceeded: {
          actions: ['updateTopChunk', 'updateBottomChunk'],
          target: 'loaded',
        },
        positionChanged: {
          target: 'loadingAround',
          internal: false,
        },
        loadAroundFailed: {
          target: 'failedNoData',
        },
        timeRangeChanged: {},
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
                  cond: 'succeededTop',
                  target: 'loaded',
                },
                {
                  cond: '!succeededTop',
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
                  actions: 'rotateChunksUpwards',
                  cond: 'isNearStart',
                  target: '#logExplorerData.loadingTop',
                },
              },
            },
          },
        },
        bottom: {
          initial: 'start',
          states: {
            start: {
              always: [
                {
                  cond: 'succeededBottom',
                  target: 'loaded',
                },
                {
                  cond: '!succeededBottom',
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
                  actions: 'rotateChunkDownwards',
                  cond: 'isNearEnd',
                  target: '#logExplorerData.loadingBottom',
                },
              },
            },
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
            actions: 'extendTopChunk',
            cond: 'startTimestampExtendsLoadedTop',
            target: 'extendingTop',
          },
          {
            actions: 'reduceTopChunk',
            cond: 'startTimestampReducesLoadedTop',
          },
          {
            actions: 'extendBottomChunk',
            cond: 'endTimestampExtendsLoadedBottom',
            target: 'extendingBottom',
          },
          {
            actions: 'reduceBottomChunk',
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
          target: 'loadingAround',
        },
        timeRangeChanged: {
          target: 'loadingAround',
        },
      },
    },
    loadingTop: {
      invoke: {
        src: 'loadBefore',
        id: 'loadBefore',
      },
      on: {
        loadTopSucceeded: {
          actions: 'updateTopChunk',
          target: '#logExplorerData.loaded.top.loaded',
        },
        loadTopFailed: {
          actions: 'updateTopChunk',
          target: '#logExplorerData.loaded.top.failed',
        },
        columnsChanged: {
          target: 'reloading',
        },
      },
    },
    loadingBottom: {
      invoke: {
        src: 'loadAfter',
        id: 'loadAfter',
      },
      on: {
        loadBottomSucceeded: {
          actions: 'updateBottomChunk',
          target: '#logExplorerData.loaded.bottom.loaded',
        },
        loadBottomFailed: {
          actions: 'updateBottomChunk',
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
          actions: 'prependToTopChunk',
          target: '#logExplorerData.loaded.top.loaded',
        },
        extendTopFailed: {
          actions: 'updateBottomChunk',
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
          actions: 'appendToBottomChunk',
          target: '#logExplorerData.loaded.bottom.loaded',
        },
        extendBottomFailed: {
          actions: 'updateBottomChunk',
          target: '#logExplorerData.loaded.bottom.failed',
        },
        columnsChanged: {
          target: 'reloading',
        },
      },
    },
    reloading: {
      invoke: {
        src: 'reload',
        id: 'reload',
      },
      on: {
        reloadFailed: {
          target: 'failedNoData',
        },
        reloadSucceeded: {
          actions: ['updateTopChunk', 'updateBottomChunk'],
          target: 'loaded',
        },
      },
    },
  },
  on: {
    filtersChanged: {
      target: '.loadingAround',
    },
    dataViewChanged: {
      target: '.loadingAround',
    },
  },
});

export type DataAccessStateMachine = typeof dataAccessStateMachine;
export type DataAccessService = InterpreterFrom<DataAccessStateMachine>;
