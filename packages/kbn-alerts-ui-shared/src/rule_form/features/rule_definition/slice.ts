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
  AlertConsumers,
  STACK_ALERTS_FEATURE_ID,
  RuleCreationValidConsumer,
} from '@kbn/rule-data-utils';
import {
  getDurationNumberInItsUnit,
  getDurationUnitValue,
} from '../../../common/helpers/parse_duration';
import { useRuleFormSelector } from '../../hooks';
import { DEFAULT_VALID_CONSUMERS } from '../../common/constants';

const initialState: {
  id: string;
  params: Record<string, unknown>;
  interval: string;
  consumer: RuleCreationValidConsumer | null;
  alertDelay?: {
    active: number;
  };
} = {
  id: '',
  params: {},
  interval: '1m',
  consumer: 'alerts',
  alertDelay: undefined,
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
    setIntervalNumber(state, { payload }: PayloadAction<number | ''>) {
      state.interval = `${payload}${getDurationUnitValue(state.interval)}`;
    },
    setIntervalUnit(state, { payload }: PayloadAction<string>) {
      state.interval = `${getDurationNumberInItsUnit(state.interval)}${payload}`;
    },
    setAlertDelay(state, { payload }: PayloadAction<number | undefined>) {
      if (payload) {
        state.alertDelay = {
          active: payload,
        };
      } else {
        state.alertDelay = undefined;
      }
    },
    setConsumer(state, { payload }: PayloadAction<RuleCreationValidConsumer | null>) {
      state.consumer = payload;
    },
    initializeAndValidateConsumer(
      state,
      {
        payload: validConsumers = DEFAULT_VALID_CONSUMERS,
      }: PayloadAction<RuleCreationValidConsumer[] | undefined>
    ) {
      // If valid consumers includes Observability, lock the consumer to Observability
      // This is used for serverless
      if (validConsumers.includes(AlertConsumers.OBSERVABILITY)) {
        state.consumer = AlertConsumers.OBSERVABILITY;
        return;
      }

      // If the initial consumer is null, require the user to manually set it
      if (!state.consumer) return;
      // If the initial consumer is valid, do nothing
      if (validConsumers.includes(state.consumer)) return;
      // If the initial consumer is invalid, set it to stackAlerts if available,
      // otherwise the first valid consumer
      if (validConsumers.includes(STACK_ALERTS_FEATURE_ID)) {
        state.consumer = STACK_ALERTS_FEATURE_ID;
      } else {
        state.consumer = validConsumers[0];
      }
    },
  },
});

export const ruleDefinitionReducer = ruleDefinitionSlice.reducer;
export const {
  setParam,
  replaceParams,
  setIntervalNumber,
  setIntervalUnit,
  setConsumer,
  setAlertDelay,
  initializeAndValidateConsumer,
} = ruleDefinitionSlice.actions;

export const useSelectIntervalNumber = () =>
  useRuleFormSelector((state) => getDurationNumberInItsUnit(state.ruleDefinition.interval));
export const useSelectIntervalUnit = () =>
  useRuleFormSelector((state) => getDurationUnitValue(state.ruleDefinition.interval));
export const useSelectAlertDelay = () =>
  useRuleFormSelector((state) => state.ruleDefinition.alertDelay?.active);

export const useSelectAreAdvancedOptionsSet = () =>
  useRuleFormSelector((state) => {
    const { alertDelay } = state.ruleDefinition;
    return Boolean(alertDelay);
  });
