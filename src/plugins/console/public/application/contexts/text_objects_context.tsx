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

import { Store, Action, reducer, initialValue } from '../stores/text_object';

import { createUseContext } from './create_use_context';
const TextObjectsReadContext = createContext<Store>(undefined as any);
const TextObjectsActionContext = createContext<Dispatch<Action>>(undefined as any);

export const TextObjectsContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialValue);
  return (
    <TextObjectsReadContext.Provider value={state}>
      <TextObjectsActionContext.Provider value={dispatch}>
        {children}
      </TextObjectsActionContext.Provider>
    </TextObjectsReadContext.Provider>
  );
};

export const useTextObjectsReadContext = createUseContext(
  TextObjectsReadContext,
  'TextObjectsReadContext'
);
export const useTextObjectsActionContext = createUseContext(
  TextObjectsActionContext,
  'TextObjectsActionContext'
);
