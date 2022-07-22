/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimeRange } from '@kbn/es-query';

export type Timestamp = TimeRange['from'];
export type Tiebreaker = number;

export type SortDirection = 'asc' | 'desc';
export type SortCriterion = [string, SortDirection];
export type SortCriteria = SortCriterion[];

export interface LogExplorerPosition {
  timestamp: Timestamp;
  tiebreaker: Tiebreaker;
}

export interface LogExplorerEntry {
  position: LogExplorerPosition;
  fields: Record<string, unknown>;
}

// totally incomplete
export type LogExplorerChunk =
  | {
      status: 'loaded';
      startPosition: LogExplorerPosition;
      endPosition: LogExplorerPosition;
      entries: [LogExplorerEntry, ...LogExplorerEntry[]];
      chunkSize: number;
    }
  | {
      status: 'empty';
      startPosition: LogExplorerPosition;
      endPosition: LogExplorerPosition;
    }
  | {
      status: 'loading-top';
      endPosition: LogExplorerPosition;
      chunkSize: number;
    }
  | {
      status: 'loading-bottom';
      startPosition: LogExplorerPosition;
      chunkSize: number;
    }
  | {
      status: 'uninitialized';
    };
