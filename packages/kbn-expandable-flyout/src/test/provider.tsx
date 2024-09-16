/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Provider as ReduxProvider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React, { FC, PropsWithChildren } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { ExpandableFlyoutContextProvider } from '../context';
import { panelsReducer } from '../store/reducers';
import { Context } from '../store/redux';
import { initialState, State } from '../store/state';

interface TestProviderProps {
  state?: State;
  urlKey?: string;
}

export const TestProvider: FC<PropsWithChildren<TestProviderProps>> = ({
  children,
  state = initialState,
  urlKey,
}) => {
  const store = configureStore({
    reducer: {
      panels: panelsReducer,
    },
    devTools: false,
    preloadedState: state,
    enhancers: [],
  });

  return (
    <I18nProvider>
      <ExpandableFlyoutContextProvider urlKey={urlKey}>
        <ReduxProvider store={store} context={Context}>
          {children}
        </ReduxProvider>
      </ExpandableFlyoutContextProvider>
    </I18nProvider>
  );
};
