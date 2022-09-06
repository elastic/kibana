/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LoadHistogramEvent } from './services/load_histogram_service';
import { SharedContext, SharedExternalEvent } from '../data_access_state_machine';
import { LogExplorerHistogramData } from '../../types';

interface Context {
  breakdownField: string; // NOTE: Not hooked up for real yet
  histogram: LogExplorerHistogramData;
}

export type HistogramMachineContext = SharedContext & Context;

// the value union is not ideal, but the closest we can get without typegen
export interface HistogramMachineState {
  value:
    | 'uninitialized' // not used yet, but there's a setting that disables automatic initial search
    | 'loading'
    | 'loaded';
  context: HistogramMachineContext;
}

export type HistogramMachineExternalEvent = SharedExternalEvent;

export type HistogramMachineInternalEvent =
  | {
      type: 'load';
    }
  | LoadHistogramEvent;

export type HistogramMachineEvent = HistogramMachineExternalEvent | HistogramMachineInternalEvent;
