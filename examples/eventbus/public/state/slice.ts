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

interface EventBusExampleState {
  esql: string;
  allFields: string[];
  selectedFields: string[];
  filters: Record<string, string>;
}

interface SetCrossfilterActionPayload {
  id: string;
  filter: string;
}

function getDefaultState(): EventBusExampleState {
  return {
    esql: 'FROM kibana_sample_data_logs',
    allFields: [],
    selectedFields: [],
    filters: {},
  };
}

export const eventBusExampleSlice = createSlice({
  name: 'eventBusExampleState',
  initialState: getDefaultState(),
  reducers: {
    setESQL: (state: EventBusExampleState, action: PayloadAction<string>) => {
      state.esql = action.payload;
    },
    setAllFields: (state: EventBusExampleState, action: PayloadAction<string[]>) => {
      state.allFields = action.payload;
    },
    setSelectedFields: (state: EventBusExampleState, action: PayloadAction<string[]>) => {
      state.selectedFields = action.payload;
    },
    toggleSelectedFields: (state: EventBusExampleState, action: PayloadAction<string>) => {
      const idx = state.selectedFields.indexOf(action.payload);
      if (idx === -1) {
        state.selectedFields.push(action.payload);
      } else {
        state.selectedFields.splice(idx, 1);
      }
      // sort fields
      state.selectedFields.sort();
    },
    setCrossfilter: (
      state: EventBusExampleState,
      action: PayloadAction<SetCrossfilterActionPayload>
    ) => {
      if (action.payload.filter) {
        state.filters[action.payload.id] = action.payload.filter;
      } else {
        delete state.filters[action.payload.id];
      }
    },
  },
});

export type EventBusExampleSlice = typeof eventBusExampleSlice;
