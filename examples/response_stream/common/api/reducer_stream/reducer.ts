/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getInitialState, type StreamState } from '../stream_state';
import { type ReducerStreamApiAction, API_ACTION_NAME } from './reducer_actions';

export const UI_ACTION_NAME = {
  RESET: 'reset',
} as const;
export type UiActionName = (typeof UI_ACTION_NAME)[keyof typeof UI_ACTION_NAME];

interface UiActionResetStream {
  type: typeof UI_ACTION_NAME.RESET;
}

export function resetStream(): UiActionResetStream {
  return { type: UI_ACTION_NAME.RESET };
}

type UiAction = UiActionResetStream;
export type ReducerAction = ReducerStreamApiAction | UiAction;
export function reducerStreamReducer(state: StreamState, action: ReducerAction): StreamState {
  switch (action.type) {
    case API_ACTION_NAME.UPDATE_PROGRESS:
      return {
        ...state,
        progress: action.payload,
      };
    case API_ACTION_NAME.DELETE_ENTITY:
      const deleteFromEntities = { ...state.entities };
      delete deleteFromEntities[action.payload];
      return {
        ...state,
        entities: deleteFromEntities,
      };
    case API_ACTION_NAME.ADD_TO_ENTITY:
      const addToEntities = { ...state.entities };
      if (addToEntities[action.payload.entity] === undefined) {
        addToEntities[action.payload.entity] = action.payload.value;
      } else {
        addToEntities[action.payload.entity] += action.payload.value;
      }
      return {
        ...state,
        entities: addToEntities,
      };
    case API_ACTION_NAME.ERROR:
      return {
        ...state,
        errors: [...state.errors, action.payload],
      };
    case UI_ACTION_NAME.RESET:
      return getInitialState();
    default:
      return state;
  }
}
