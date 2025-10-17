/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reducer } from 'react';
import { cloneDeep } from 'lodash';
import type { BaseResponseType } from '../../types/common';
import type { RequestResult } from '../hooks/use_send_current_request/send_request';

export type Actions =
  | { type: 'sendRequest'; payload: undefined }
  | { type: 'cleanRequest'; payload: undefined }
  | { type: 'requestSuccess'; payload: { data: RequestResult[] } }
  | { type: 'requestFail'; payload: RequestResult<string> | undefined };

export interface Store {
  requestInFlight: boolean;
  lastResult: {
    data: RequestResult[] | null;
    error?: RequestResult<string>;
  };
}

const initialResultValue = {
  data: null,
  type: 'unknown' as BaseResponseType,
};

export const initialValue: Store = {
  requestInFlight: false,
  lastResult: initialResultValue,
};

export const reducer: Reducer<Store, Actions> = (state, action) => {
  const draft = cloneDeep(state);

  if (action.type === 'sendRequest') {
    draft.requestInFlight = true;
    draft.lastResult = initialResultValue;
    return draft;
  }

  if (action.type === 'requestSuccess') {
    draft.requestInFlight = false;
    draft.lastResult = action.payload;
    return draft;
  }

  if (action.type === 'requestFail') {
    draft.requestInFlight = false;
    draft.lastResult = { ...initialResultValue, error: action.payload };
    return draft;
  }

  if (action.type === 'cleanRequest') {
    draft.requestInFlight = false;
    draft.lastResult = initialResultValue;
    return draft;
  }

  return state;
};
