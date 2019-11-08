/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Reducer } from 'react';
import { produce } from 'immer';
import { identity } from 'fp-ts/lib/function';
import { BaseResponseTypes } from '../components/output_pane';

export type Actions =
  | { type: 'sendRequest'; payload: undefined }
  | { type: 'requestSuccess'; payload: { data: unknown; type: BaseResponseTypes } }
  | { type: 'requestFail'; payload: string };

export interface Store {
  requestInFlight: boolean;
  lastResult: { type: BaseResponseTypes; data: unknown } | null;
  error: string | null;
}

const initialValue: Store = produce<Store>(
  {
    requestInFlight: false,
    lastResult: null,
    error: null,
  },
  identity
);

export const reducer: Reducer<Store, Actions> = (state = initialValue, action) =>
  produce<Store>(state, draft => {
    if (action.type === 'sendRequest') {
      draft.requestInFlight = true;
      draft.lastResult = null;
      draft.error = null;
      return;
    }

    if (action.type === 'requestSuccess') {
      draft.requestInFlight = false;
      draft.error = null;
      draft.lastResult = action.payload;
      return;
    }

    if (action.type === 'requestFail') {
      draft.requestInFlight = false;
      draft.lastResult = null;
      draft.error = action.payload;
      return;
    }
  });
