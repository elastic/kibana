/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as rt from 'io-ts';

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
      entries: LogExplorerEntry[];
      chunkSize: number;
      rowIndex: number;
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
      rowIndex: number;
    }
  | {
      status: 'loading-bottom';
      startPosition: LogExplorerPosition;
      chunkSize: number;
      rowIndex: number;
    }
  | {
      status: 'uninitialized';
    };
