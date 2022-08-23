/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { assign } from 'xstate';
import { EntriesMachineEvent } from '../../entries_state_machine/types';
import { HistogramMachineEvent } from '../../histogram_state_machine/types';
import { SharedContext } from '../types';

export const updateFilters = assign(
  (context: SharedContext, event: EntriesMachineEvent | HistogramMachineEvent) => {
    if (event.type !== 'filtersChanged') {
      return context;
    }

    const { filters, query } = event;

    return {
      ...context,
      filters,
      query,
    };
  }
);
