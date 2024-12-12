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

type AllFields = Record<string, string>;

interface EventBusExampleState {
  chartWidth: number;
  esql: string;
  aiopsEnabled: boolean;
  aiopsFieldCandidates: string[];
  allFields: AllFields;
  genaiEnabled: boolean;
  selectedFields: string[];
  filters: Record<string, string>;
}

interface SetCrossfilterActionPayload {
  id: string;
  filter: string;
}

function getDefaultState(): EventBusExampleState {
  return {
    chartWidth: 0,
    esql: 'FROM kibana_sample_data_logs',
    aiopsEnabled: false,
    aiopsFieldCandidates: [],
    allFields: {},
    genaiEnabled: false,
    selectedFields: [],
    filters: {},
  };
}

export const eventBusExampleSlice = createSlice({
  name: 'eventBusExampleState',
  initialState: getDefaultState(),
  reducers: {
    setChartWidth: (state: EventBusExampleState, action: PayloadAction<number>) => {
      state.chartWidth = action.payload;
    },
    setESQL: (state: EventBusExampleState, action: PayloadAction<string>) => {
      state.esql = action.payload;
    },
    setAiopsEnabled: (state: EventBusExampleState, action: PayloadAction<boolean>) => {
      state.aiopsEnabled = action.payload;
    },
    setAiopsFieldCandidates: (state: EventBusExampleState, action: PayloadAction<string[]>) => {
      state.aiopsFieldCandidates = action.payload;
    },
    setAllFields: (state: EventBusExampleState, action: PayloadAction<AllFields>) => {
      state.allFields = action.payload;
    },
    setGenAIEnabled: (state: EventBusExampleState, action: PayloadAction<boolean>) => {
      state.genaiEnabled = action.payload;
    },
    setSelectedFields: (state: EventBusExampleState, action: PayloadAction<string[]>) => {
      state.selectedFields = action.payload;
    },
    toggleSelectedField: (state: EventBusExampleState, action: PayloadAction<string>) => {
      const idx = state.selectedFields.indexOf(action.payload);
      if (idx === -1) {
        state.selectedFields.push(action.payload);
      } else {
        state.selectedFields.splice(idx, 1);
      }
      // sort fields
      state.selectedFields.sort();
    },
    setFilter: (
      state: EventBusExampleState,
      action: PayloadAction<SetCrossfilterActionPayload>
    ) => {
      if (action.payload.filter !== '') {
        state.filters[action.payload.id] = action.payload.filter;
      } else {
        delete state.filters[action.payload.id];
      }
    },
  },
});

export type EventBusExampleSlice = typeof eventBusExampleSlice;
