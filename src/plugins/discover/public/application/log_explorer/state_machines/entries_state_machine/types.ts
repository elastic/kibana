/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import type { Filter, TimeRange } from '@kbn/es-query';
import { EuiDataGridRefProps } from '@elastic/eui';
import { LogExplorerChunk, LogExplorerPosition } from '../../types';
import { LoadAfterEvent } from './services/load_after_service';
import { LoadAroundEvent } from './services/load_around_service';
import { LoadBeforeEvent } from './services/load_before_service';
import { LoadTailEvent } from './services/load_tail_service';
import { SharedContext, LogExplorerQuery } from '../data_access_state_machine';

interface Context {
  configuration: {
    chunkSize: number;
    minimumChunkOverscan: number;
    maximumRowCount: number;
  };
  topChunk: LogExplorerChunk;
  bottomChunk: LogExplorerChunk;
}

export type EntriesMachineContext = SharedContext & Context;

export type LogExplorerLoadedChunkStateValue =
  | 'empty'
  | 'loaded'
  | { loaded: 'partial' | 'full' }
  | 'failed';

export type LogExplorerLoadedGridStateValue =
  | 'staleAfterLoadAround'
  | 'staleAfterLoadBefore'
  | 'staleAfterLoadAfter'
  | 'waitingForSynchronization'
  | 'synchronized';

export type EntriesMachineStateValue =
  | 'uninitialized' // not used yet, but there's a setting that disables automatic initial search
  | 'loadingAround'
  | 'failedNoData'
  | 'loaded'
  | {
      loaded: {
        top: LogExplorerLoadedChunkStateValue;
        bottom: LogExplorerLoadedChunkStateValue;
        grid: LogExplorerLoadedGridStateValue;
      };
    }
  | 'loadingTop'
  | 'loadingBottom'
  | 'extendingTop'
  | 'extendingBottom'
  | 'tailing'
  | { tailing: 'loading' | 'loaded' };

// the value union is not ideal, but the closest we can get without typegen
export interface EntriesMachineState {
  value: EntriesMachineStateValue;
  context: EntriesMachineContext;
}

export type EntriesMachineEvent =
  | {
      type: 'load';
    }
  | {
      type: 'retry';
    }
  | {
      type: 'retryBottom';
    }
  | {
      type: 'retryTop';
    }
  | {
      type: 'requestMoreBefore';
    }
  | {
      type: 'requestMoreAfter';
    }
  | LoadAroundEvent
  | LoadBeforeEvent
  | LoadAfterEvent
  | LoadTailEvent
  | {
      // the following event types will be moved to their respective services
      // once these exist
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
    }
  | {
      type: 'startTailing';
    }
  | {
      type: 'stopTailing';
    }
  | {
      type: 'reloadTail';
    }
  | {
      type: 'columnsChanged';
    }
  | {
      type: 'timeRangeChanged';
      timeRange: TimeRange;
    }
  | {
      type: 'filtersChanged';
      filters: Filter[];
      query: LogExplorerQuery;
    }
  | {
      type: 'dataViewChanged';
      dataView: DataView;
    }
  | {
      type: 'positionChanged';
      position: LogExplorerPosition;
    }
  | {
      type: 'visibleEntriesChanged';
      visibleStartRowIndex: number;
      visibleEndRowIndex: number;
      gridApi: EuiDataGridRefProps;
    };
