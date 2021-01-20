/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Reducer } from 'react';
import { produce } from 'immer';
import { identity } from 'fp-ts/lib/function';
import { BaseResponseType } from '../../types/common';
import { ESRequestResult } from '../hooks/use_send_current_request_to_es/send_request_to_es';

export type Actions =
  | { type: 'sendRequest'; payload: undefined }
  | { type: 'requestSuccess'; payload: { data: ESRequestResult[] } }
  | { type: 'requestFail'; payload: ESRequestResult<string> | undefined };

export interface Store {
  requestInFlight: boolean;
  lastResult: {
    data: ESRequestResult[] | null;
    error?: ESRequestResult<string>;
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
