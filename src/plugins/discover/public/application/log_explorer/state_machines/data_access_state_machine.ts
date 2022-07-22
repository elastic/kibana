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

export interface LogExplorerContext {
  dataView: DataView;
  timeRange: TimeRange;
  position: LogExplorerPosition;
  topChunk: LogExplorerChunk;
  bottomChunk: LogExplorerChunk;
}

export type LogExplorerEvent =
  | {
      type: 'columns-changed';
      columns: string[];
    }
  | {
      type: 'load-around';
    }
  | {
      type: 'time-range-changed';
      timeRange: TimeRange;
    }
  | {
      type: 'retry';
    }
  | {
      type: 'retry-bottom';
    }
  | {
      type: 'retry-top';
    }
  | {
      type: 'filters-changed';
    }
  | {
      type: 'data-view-changed';
      dataView: DataView;
    }
  | {
      type: 'position-changed';
      position: LogExplorerPosition;
    };

export const dataAccessStateMachine = createMachine({
  schema: {
    context: {} as LogExplorerContext,
    events: {} as LogExplorerEvent,
  },
  id: 'Log Explorer Data',
  initial: 'loading-around',
  states: {
    'loading-around': {
      entry: 'resetChunks',
      invoke: {
        src: 'loadAround',
        onDone: [
          {
            actions: ['updateTopChunk', 'updateBottomChunk'],
            target: ['loaded.top.loaded', 'loaded.bottom.loaded'],
          },
        ],
        onError: [
          {
            target: 'failed-no-data',
          },
        ],
      },
      on: {
        'position-changed': {
          target: 'loading-around',
          internal: false,
        },
        'time-range-changed': {},
        'columns-changed': {},
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
                'retry-top': {
                  target: '#Log Explorer Data.extending-top',
                },
              },
            },
            loaded: {
              on: {
                'position-changed': {
                  actions: 'rotateChunksUpwards',
                  cond: 'isNearStart',
                  target: '#Log Explorer Data.loading-top',
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
                'retry-bottom': {
                  target: '#Log Explorer Data.extending-bottom',
                },
              },
            },
            loaded: {
              on: {
                'position-changed': {
                  actions: 'rotateChunkDownwards',
                  cond: 'isNearEnd',
                  target: '#Log Explorer Data.loading-bottom',
                },
              },
            },
          },
        },
      },
      on: {
        'position-changed': {
          cond: '!isWithinLoadedChunks',
          target: 'loading-around',
        },
        'time-range-changed': [
          {
            actions: 'extendTopChunk',
            cond: 'startTimestampExtendsLoadedTop',
            target: 'extending-top',
          },
          {
            actions: 'reduceTopChunk',
            cond: 'startTimestampReducesLoadedTop',
          },
          {
            actions: 'extendBottomChunk',
            cond: 'endTimestampExtendsLoadedBottom',
            target: 'extending-bottom',
          },
          {
            actions: 'reduceBottomChunk',
            cond: 'endTimestampReducesLoadedBottom',
          },
          {
            actions: 'reset-position',
            target: 'loading-around',
          },
        ],
        'columns-changed': {
          target: 'reloading',
        },
      },
    },
    'failed-no-data': {
      on: {
        'position-changed': {
          target: 'loading-around',
        },
        retry: {
          target: 'loading-around',
        },
        'filters-changed': {
          target: 'loading-around',
        },
        'time-range-changed': {
          target: 'loading-around',
        },
      },
    },
    'loading-top': {
      invoke: {
        src: 'loadBefore',
        onDone: [
          {
            actions: 'updateTopChunk',
            target: '#Log Explorer Data.loaded.top.loaded',
          },
        ],
        onError: [
          {
            actions: 'updateTopChunk',
            target: '#Log Explorer Data.loaded.top.failed',
          },
        ],
      },
      on: {
        'columns-changed': {
          target: 'reloading',
        },
      },
    },
    'loading-bottom': {
      invoke: {
        src: 'loadAfter',
        onDone: [
          {
            actions: 'updateTopChunk',
            target: '#Log Explorer Data.loaded.bottom.loaded',
          },
        ],
        onError: [
          {
            actions: 'updateBottomChunk',
            target: '#Log Explorer Data.loaded.bottom.failed',
          },
        ],
      },
      on: {
        'columns-changed': {
          target: 'reloading',
        },
      },
    },
    'extending-top': {
      invoke: {
        src: 'extendTop',
        onDone: [
          {
            actions: 'prependToTopChunk',
            target: '#Log Explorer Data.loaded.top.loaded',
          },
        ],
        onError: [
          {
            actions: 'updateBottomChunk',
            target: '#Log Explorer Data.loaded.top.failed',
          },
        ],
      },
      on: {
        'columns-changed': {
          target: 'reloading',
        },
      },
    },
    'extending-bottom': {
      invoke: {
        src: 'extendBottom',
        onDone: [
          {
            actions: 'appendToBottomChunk',
            target: '#Log Explorer Data.loaded.bottom.loaded',
          },
        ],
        onError: [
          {
            actions: 'updateBottomChunk',
            target: '#Log Explorer Data.loaded.bottom.failed',
          },
        ],
      },
      on: {
        'columns-changed': {
          target: 'reloading',
        },
      },
    },
    reloading: {
      invoke: {
        src: 'reload',
        onError: [
          {
            target: 'failed-no-data',
          },
        ],
        onDone: [
          {
            actions: ['updateTopChunk', 'updateBottomChunk'],
            target: 'loaded',
          },
        ],
      },
    },
  },
  on: {
    'filters-changed': {
      target: '.loading-around',
    },
    'data-view-changed': {
      target: '.loading-around',
    },
  },
});

export type DataAccessStateMachine = typeof dataAccessStateMachine;
export type DataAccessService = InterpreterFrom<DataAccessStateMachine>;
