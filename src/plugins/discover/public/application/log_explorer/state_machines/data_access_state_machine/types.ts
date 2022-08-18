/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { LogExplorerChunk, LogExplorerPosition, LogExplorerHistogramData } from '../../types';
import { LoadAfterEvent } from './load_after_service';
import { LoadAroundEvent } from './load_around_service';
import { LoadBeforeEvent } from './load_before_service';
import { LoadHistogramEvent } from './load_histogram_service';
import { LoadTailEvent } from './load_tail_service';

export interface LogExplorerContext {
  configuration: {
    chunkSize: number;
    minimumChunkOverscan: number;
  };
  dataView: DataView;
  position: LogExplorerPosition;
  timeRange: TimeRange;
  filters: Filter[];
  query: LogExplorerQuery | undefined;

  topChunk: LogExplorerChunk;
  bottomChunk: LogExplorerChunk;

  histogram: {
    data: LogExplorerHistogramData;
  };
}

export type LogExplorerQuery = Query | AggregateQuery;

export type LogExplorerLoadedChunkStateValue = 'empty' | 'loaded' | 'failed';

export type LogExplorerDocumentsStateValue =
  | 'uninitialized' // not used yet, but there's a setting that disables automatic initial search
  | 'loadingAround'
  | 'failedNoData'
  | 'loaded'
  | { loaded: { top: LogExplorerLoadedChunkStateValue; bottom: LogExplorerLoadedChunkStateValue } }
  | 'loadingTop'
  | 'loadingBottom'
  | 'extendingTop'
  | 'extendingBottom'
  | 'tailing'
  | { tailing: 'loading' | 'loaded' };

export type LogExplorerHistogramStateValue = 'uninitialized' | 'loading' | 'loaded';

// the value union is not ideal, but the closest we can get without typegen
export interface LogExplorerState {
  value:
    | {
        documents: LogExplorerDocumentsStateValue;
        histogram: LogExplorerHistogramStateValue;
      }
    | {
        documents: LogExplorerDocumentsStateValue;
      }
    | {
        histogram: LogExplorerHistogramStateValue;
      };
  context: LogExplorerContext;
}

export type LogExplorerExternalEvent =
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
    };

export type LogExplorerInternalEvent =
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
  | LoadAroundEvent
  | LoadBeforeEvent
  | LoadAfterEvent
  | LoadTailEvent
  | LoadHistogramEvent
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
    };

export type LogExplorerEvent = LogExplorerExternalEvent | LogExplorerInternalEvent;
