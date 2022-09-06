/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as rt from 'io-ts';
import { DataTableRecord } from '../../types';

export type Timestamp = string;
export type Tiebreaker = number;

export type SortDirection = 'asc' | 'desc';
export type SortCriterion = [string, SortDirection];
export type SortCriteria = SortCriterion[];

export const LogExplorerCursorRT = rt.tuple([rt.string, rt.number]);
export type LogExplorerCursor = rt.TypeOf<typeof LogExplorerCursorRT>;

export interface LogExplorerPosition {
  timestamp: Timestamp;
  tiebreaker: Tiebreaker;
}

export type LogExplorerRow =
  | LogExplorerLoadedEntryRow
  | LogExplorerLoadingRow
  | LogExplorerEmptyRow;

export interface LogExplorerLoadingRow {
  type: 'loading';
}

export interface LogExplorerLoadedEntryRow {
  type: 'loaded-entry';
  entry: LogExplorerEntry;
}

export interface LogExplorerEmptyRow {
  type: 'empty';
}

export interface LogExplorerEntry extends DataTableRecord {
  id: string;
  index: string;
  position: LogExplorerPosition;
}

// totally incomplete
export type LogExplorerChunk =
  | {
      status: 'loaded';
      startPosition: LogExplorerPosition;
      endPosition: LogExplorerPosition;
      entries: LogExplorerEntry[];
      chunkSize: number;
      startRowIndex: number;
      endRowIndex: number;
    }
  | {
      status: 'empty';
      startPosition: LogExplorerPosition;
      endPosition: LogExplorerPosition;
      chunkSize: number;
      rowIndex: number;
    }
  | {
      status: 'loading-top';
      endPosition: LogExplorerPosition;
      chunkSize: number;
      startRowIndex: number;
      endRowIndex: number;
    }
  | {
      status: 'loading-bottom';
      startPosition: LogExplorerPosition;
      chunkSize: number;
      startRowIndex: number;
      endRowIndex: number;
    }
  | {
      status: 'uninitialized';
    };

export interface LogExplorerHistogramDataPoint {
  startTime: Timestamp;
  countByBreakdownCriterion: Record<string, number>;
}

export type LogExplorerHistogramData = LogExplorerHistogramDataPoint[];

export type LogExplorerBreakdownField = string;
