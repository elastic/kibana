/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  getDurationNumberInItsUnit,
  getDurationUnitValue,
} from '../../../common/helpers/parse_duration';
import { useRuleFormSelector } from '../../hooks';

const initialState: {
  id: string;
  params: Record<string, unknown>;
  interval: string;
} = {
  id: '',
  params: {},
  interval: '1m',
};

export const ruleDefinitionSlice = createSlice({
  name: 'ruleDefinition',
  initialState,
  reducers: {
    setParam(state, { payload: [key, value] }: PayloadAction<[string, unknown]>) {
      state.params[key] = value;
    },
    replaceParams(state, { payload }: PayloadAction<Record<string, unknown>>) {
      state.params = payload;
    },
    setIntervalNumber(state, { payload }: PayloadAction<string>) {
      state.interval = `${payload}${getDurationUnitValue(state.interval)}`;
    },
    setIntervalUnit(state, { payload }: PayloadAction<string>) {
      state.interval = `${getDurationNumberInItsUnit(state.interval)}${payload}`;
    },
  },
});

export const ruleDefinitionReducer = ruleDefinitionSlice.reducer;
export const { setParam, replaceParams, setIntervalNumber, setIntervalUnit } =
  ruleDefinitionSlice.actions;

export const useSelectIntervalNumber = () =>
  useRuleFormSelector((state) => getDurationNumberInItsUnit(state.ruleDefinition.interval));
export const useSelectIntervalUnit = () =>
  useRuleFormSelector((state) => getDurationUnitValue(state.ruleDefinition.interval));
