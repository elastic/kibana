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

import React, { Dispatch } from 'react';
import { createContext, useContext, useState } from 'react';
import { ThemeMode } from '../../types';

interface AppContext {
  themeMode: ThemeMode;
}

let initialState: AppContext = {
  themeMode: 'light',
};

export const setInitialState = (overrides: Partial<AppContext>) => {
  initialState = {
    ...initialState,
    ...overrides,
  };
};

const context = createContext<[AppContext, Dispatch<AppContext>]>(null as any);

export const AppContextProvider = ({ children }: any) => {
  return <context.Provider value={useState(initialState)}>{children}</context.Provider>;
};

export const useAppContext = () => useContext(context);
