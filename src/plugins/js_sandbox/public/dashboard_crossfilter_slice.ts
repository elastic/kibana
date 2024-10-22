/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

interface DashboardCrossfilterState {
  filters: Record<string, string>;
}

interface SetCrossfilterActionPayload {
  id: string;
  filter: string;
}

function getDefaultState(): DashboardCrossfilterState {
  return {
    filters: {},
  };
}

export const dashboardCrossfilterSlice = createSlice({
  name: 'dashboardCrossfilter',
  initialState: getDefaultState(),
  reducers: {
    setCrossfilter: (
      state: DashboardCrossfilterState,
      action: PayloadAction<SetCrossfilterActionPayload>
    ) => {
      console.log('----> set filter', action.payload);
      if (action.payload.filter) {
        state.filters[action.payload.id] = action.payload.filter;
      } else {
        delete state.filters[action.payload.id];
      }
    },
  },
});

export type DashboardCrossfilterSlice = typeof dashboardCrossfilterSlice;
