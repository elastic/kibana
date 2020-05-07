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

import React, { createContext, useReducer, Dispatch } from 'react';
import { createUseContext } from './create_use_context';
import * as store from '../stores/request';

const RequestReadContext = createContext<store.Store>(null as any);
const RequestActionContext = createContext<Dispatch<store.Actions>>(null as any);

export function RequestContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(store.reducer, store.initialValue);
  return (
    <RequestReadContext.Provider value={state}>
      <RequestActionContext.Provider value={dispatch}>{children}</RequestActionContext.Provider>
    </RequestReadContext.Provider>
  );
}

export const useRequestReadContext = createUseContext(RequestReadContext, 'RequestReadContext');
export const useRequestActionContext = createUseContext(
  RequestActionContext,
  'RequestActionContext'
);
