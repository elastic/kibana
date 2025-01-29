/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC, type PropsWithChildren } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import { streamSlice } from '@kbn/ml-response-stream/client';

import { optionsSlice } from '../../../../../common/api/redux_stream/options_slice';
import { dataSlice } from '../../../../../common/api/redux_stream/data_slice';

const reduxStore = configureStore({
  reducer: {
    // State of the stream: is it running, has it errored, etc.
    stream: streamSlice.reducer,
    // The actual data returned by the stream.
    data: dataSlice.reducer,
    // Options for the stream: simulate errors, compress response, etc.
    options: optionsSlice.reducer,
  },
});

export const ReduxStreamProvider: FC<PropsWithChildren<{}>> = ({ children }) => (
  <Provider store={reduxStore}>{children}</Provider>
);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type AppStore = typeof reduxStore;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
