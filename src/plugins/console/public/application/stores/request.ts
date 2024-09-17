/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Reducer } from 'react';
import { produce } from 'immer';
import { identity } from 'fp-ts/lib/function';
import { BaseResponseType } from '../../types/common';
import { RequestResult } from '../hooks/use_send_current_request/send_request';

export type Actions =
  | { type: 'sendRequest'; payload: undefined }
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

export const initialValue: Store = produce<Store>(
  {
    requestInFlight: false,
    lastResult: initialResultValue,
  },
  identity
);

export const reducer: Reducer<Store, Actions> = (state, action) =>
  produce<Store>(state, (draft) => {
    if (action.type === 'sendRequest') {
      draft.requestInFlight = true;
      draft.lastResult = initialResultValue;
      return;
    }

    if (action.type === 'requestSuccess') {
      draft.requestInFlight = false;
      draft.lastResult = action.payload;
      return;
    }

    if (action.type === 'requestFail') {
      draft.requestInFlight = false;
      draft.lastResult = { ...initialResultValue, error: action.payload };
      return;
    }
  });
