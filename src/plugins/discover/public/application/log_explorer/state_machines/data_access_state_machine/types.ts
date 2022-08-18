/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { LogExplorerPosition } from '../../types';

export interface SharedContext {
  dataView: DataView;
  position: LogExplorerPosition;
  timeRange: TimeRange;
  filters: Filter[];
  query: LogExplorerQuery | undefined;
}

export type SharedExternalEvent =
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
    };

export type DataAccessMachineContext = SharedContext & {
  // Sub state machines
  entries: any;
  histogram: any;
};

export type LogExplorerQuery = Query | AggregateQuery;

// the value union is not ideal, but the closest we can get without typegen
export interface DataAccessMachineState {
  value: 'uninitialized' | 'initialized';
  context: DataAccessMachineContext;
}

export type DataAccessMachineExternalEvent =
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
    };
