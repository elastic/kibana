/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { ColorMapping } from '../config';

export interface RootState {
  colorMapping: ColorMapping.Config;
  ui: {
    colorPicker: {
      index: number;
      visibile: boolean;
      type: 'gradient' | 'assignment' | 'specialAssignment';
    };
  };
}

const initialState: RootState['colorMapping'] = {
  assignmentMode: 'auto',
  assignments: [],
  specialAssignments: [],
  paletteId: 'eui',
  colorMode: { type: 'categorical' },
};

export const colorMappingSlice = createSlice({
  name: 'colorMapping',
  initialState,
  reducers: {
    updateModel: (state, action: PayloadAction<ColorMapping.Config>) => {
      state.assignmentMode = action.payload.assignmentMode;
      state.assignments = [...action.payload.assignments];
      state.specialAssignments = [...action.payload.specialAssignments];
      state.paletteId = action.payload.paletteId;
      state.colorMode = { ...action.payload.colorMode };
    },
    updatePalette: (
      state,
      action: PayloadAction<{
        assignments: ColorMapping.Config['assignments'];
        paletteId: ColorMapping.Config['paletteId'];
        colorMode: ColorMapping.Config['colorMode'];
      }>
    ) => {
      state.paletteId = action.payload.paletteId;
      state.assignments = [...action.payload.assignments];
      state.colorMode = { ...action.payload.colorMode };
    },
    assignStatically: (state, action: PayloadAction<ColorMapping.Config['assignments']>) => {
      state.assignmentMode = 'manual';
      state.assignments = [...action.payload];
    },
    assignAutomatically: (state) => {
      state.assignmentMode = 'auto';
      state.assignments = [];
    },

    addNewAssignment: (
      state,
      action: PayloadAction<ColorMapping.Config['assignments'][number]>
    ) => {
      state.assignments.push({ ...action.payload });
    },
    updateAssignment: (
      state,
      action: PayloadAction<{
        assignmentIndex: number;
        assignment: ColorMapping.Config['assignments'][number];
      }>
    ) => {
      state.assignments[action.payload.assignmentIndex] = {
        ...action.payload.assignment,
        touched: true,
      };
    },
    updateAssignmentRule: (
      state,
      action: PayloadAction<{
        assignmentIndex: number;
        rule: ColorMapping.Config['assignments'][number]['rule'];
      }>
    ) => {
      state.assignments[action.payload.assignmentIndex] = {
        ...state.assignments[action.payload.assignmentIndex],
        rule: action.payload.rule,
      };
    },
    updateAssignmentColor: (
      state,
      action: PayloadAction<{
        assignmentIndex: number;
        color: ColorMapping.Config['assignments'][number]['color'];
      }>
    ) => {
      state.assignments[action.payload.assignmentIndex] = {
        ...state.assignments[action.payload.assignmentIndex],
        color: action.payload.color,
        touched: true,
      };
    },

    updateSpecialAssignmentColor: (
      state,
      action: PayloadAction<{
        assignmentIndex: number;
        color: ColorMapping.Config['specialAssignments'][number]['color'];
      }>
    ) => {
      state.specialAssignments[action.payload.assignmentIndex] = {
        ...state.specialAssignments[action.payload.assignmentIndex],
        color: action.payload.color,
        touched: true,
      };
    },
    removeAssignment: (state, action: PayloadAction<number>) => {
      state.assignments.splice(action.payload, 1);
    },
    changeColorMode: (state, action: PayloadAction<ColorMapping.Config['colorMode']>) => {
      state.colorMode = { ...action.payload };
    },
    updateGradientColorStep: (
      state,
      action: PayloadAction<{
        index: number;
        color: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
      }>
    ) => {
      if (state.colorMode.type !== 'gradient') {
        return;
      }

      state.colorMode = {
        ...state.colorMode,
        steps: state.colorMode.steps.map((step, index) => {
          return index === action.payload.index
            ? { ...action.payload.color, touched: true }
            : { ...step, touched: false };
        }),
      };
    },
    removeGradientColorStep: (state, action: PayloadAction<number>) => {
      if (state.colorMode.type !== 'gradient') {
        return;
      }
      const steps = [...state.colorMode.steps];
      steps.splice(action.payload, 1);

      // this maintain the correct sort direciton depending on which step
      // gets removed from the array when only 2 steps are left.
      const sort =
        state.colorMode.steps.length === 2
          ? state.colorMode.sort === 'desc'
            ? action.payload === 0
              ? 'asc'
              : 'desc'
            : action.payload === 0
            ? 'desc'
            : 'asc'
          : state.colorMode.sort;

      state.colorMode = {
        ...state.colorMode,
        steps: [...steps],
        sort,
      };
    },
    addGradientColorStep: (
      state,
      action: PayloadAction<{
        color: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
        at: number;
      }>
    ) => {
      if (state.colorMode.type !== 'gradient') {
        return;
      }

      state.colorMode = {
        ...state.colorMode,
        steps: [
          ...state.colorMode.steps.slice(0, action.payload.at),
          { ...action.payload.color, touched: false },
          ...state.colorMode.steps.slice(action.payload.at),
        ],
      };
    },

    changeGradientSortOrder: (state, action: PayloadAction<'asc' | 'desc'>) => {
      if (state.colorMode.type !== 'gradient') {
        return;
      }

      state.colorMode = {
        ...state.colorMode,
        sort: action.payload,
      };
    },
  },
});
// Action creators are generated for each case reducer function
export const {
  updatePalette,
  assignStatically,
  assignAutomatically,
  addNewAssignment,
  updateAssignment,
  updateAssignmentColor,
  updateSpecialAssignmentColor,
  updateAssignmentRule,
  removeAssignment,
  changeColorMode,
  updateGradientColorStep,
  removeGradientColorStep,
  addGradientColorStep,
  changeGradientSortOrder,
  updateModel,
} = colorMappingSlice.actions;

export const colorMappingReducer = colorMappingSlice.reducer;
