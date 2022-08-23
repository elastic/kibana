/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DataView } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { Interpreter, ActorRef, State } from 'xstate';
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

export type LogExplorerQuery = Query | AggregateQuery;

export type DataAccessMachineContext = undefined;
// the value union is not ideal, but the closest we can get without typegen
export interface DataAccessMachineState {
  value: 'uninitialized' | 'initialized';
  context: DataAccessMachineContext;
}

export interface DataAccessMachineInternalEvent {
  type: 'initialize';
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
    }
  | {
      type: 'startTailing';
    }
  | {
      type: 'stopTailing';
    };

export type DataAccessMachineEvent =
  | DataAccessMachineExternalEvent
  | DataAccessMachineInternalEvent;

export type ActorRefFromInterpreter<T> = T extends Interpreter<infer TC, {}, infer TE>
  ? ActorRef<TE, State<TC, TE>>
  : never;
