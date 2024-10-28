/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ParamInstance } from './agg_params_helper';

export enum AGG_TYPE_ACTION_KEYS {
  TOUCHED = 'aggTypeTouched',
  VALID = 'aggTypeValid',
}

export interface AggTypeState {
  touched: boolean;
  valid: boolean;
}

export interface AggTypeAction {
  type: AGG_TYPE_ACTION_KEYS;
  payload: boolean;
}

function aggTypeReducer(state: AggTypeState, action: AggTypeAction): AggTypeState {
  switch (action.type) {
    case AGG_TYPE_ACTION_KEYS.TOUCHED:
      return { ...state, touched: action.payload };
    case AGG_TYPE_ACTION_KEYS.VALID:
      return { ...state, valid: action.payload };
    default:
      throw new Error();
  }
}

export enum AGG_PARAMS_ACTION_KEYS {
  TOUCHED = 'aggParamsTouched',
  VALID = 'aggParamsValid',
  RESET = 'aggParamsReset',
}

export interface AggParamsItem {
  touched: boolean;
  valid: boolean;
}

export interface AggParamsAction {
  type: AGG_PARAMS_ACTION_KEYS;
  payload?: boolean;
  paramName?: string;
}

export interface AggParamsState {
  [key: string]: AggParamsItem;
}

function aggParamsReducer(
  state: AggParamsState,
  { type, paramName = '', payload }: AggParamsAction
): AggParamsState {
  const targetParam = state[paramName] || {
    valid: true,
    touched: false,
  };
  switch (type) {
    case AGG_PARAMS_ACTION_KEYS.TOUCHED:
      return {
        ...state,
        [paramName]: {
          ...targetParam,
          touched: payload,
        },
      } as AggParamsState;
    case AGG_PARAMS_ACTION_KEYS.VALID:
      return {
        ...state,
        [paramName]: {
          ...targetParam,
          valid: payload,
        },
      } as AggParamsState;
    case AGG_PARAMS_ACTION_KEYS.RESET:
      return {};
    default:
      throw new Error();
  }
}

function initAggParamsState(params: ParamInstance[]): AggParamsState {
  const state = params.reduce((stateObj: AggParamsState, param: ParamInstance) => {
    stateObj[param.aggParam.name] = {
      valid: true,
      touched: false,
    };

    return stateObj;
  }, {});

  return state;
}

export { aggTypeReducer, aggParamsReducer, initAggParamsState };
