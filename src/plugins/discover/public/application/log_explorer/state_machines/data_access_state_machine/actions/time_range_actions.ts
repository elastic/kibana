/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimefilterContract } from '@kbn/data-plugin/public';
import { assign } from 'xstate';
import { EntriesMachineContext, EntriesMachineEvent } from '../../entries_state_machine/types';
import {
  HistogramMachineContext,
  HistogramMachineEvent,
} from '../../histogram_state_machine/types';

export const updateTimeRange = assign(
  (
    context: EntriesMachineContext | HistogramMachineContext,
    event: EntriesMachineEvent | HistogramMachineEvent
  ) => {
    if (event.type !== 'timeRangeChanged') {
      return context;
    }

    const { timeRange } = event;

    return {
      ...context,
      timeRange,
    };
  }
);

export const updateTimeRangeFromTimefilter = (timefilter: TimefilterContract) =>
  assign((context: EntriesMachineContext, _event: EntriesMachineEvent) => {
    const timeRange = timefilter.getAbsoluteTime();

    return {
      ...context,
      timeRange,
    };
  });
