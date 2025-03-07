/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { differenceBy } from 'lodash';
import {
  type TypedUseSelectorHook,
  type ReactReduxContextValue,
  Provider as ReduxProvider,
  createDispatchHook,
  createSelectorHook,
} from 'react-redux';
import React, { type PropsWithChildren, useMemo, createContext } from 'react';
import { useAdHocDataViews } from './runtime_state';
import type { DiscoverInternalState } from './types';
import type { InternalStateDispatch, InternalStateStore } from './internal_state';

const internalStateContext = createContext<ReactReduxContextValue>(
  // Recommended approach for versions of Redux prior to v9:
  // https://github.com/reduxjs/react-redux/issues/1565#issuecomment-867143221
  null as unknown as ReactReduxContextValue
);

export const InternalStateProvider = ({
  store,
  children,
}: PropsWithChildren<{ store: InternalStateStore }>) => (
  <ReduxProvider store={store} context={internalStateContext}>
    {children}
  </ReduxProvider>
);

export const useInternalStateDispatch: () => InternalStateDispatch =
  createDispatchHook(internalStateContext);

export const useInternalStateSelector: TypedUseSelectorHook<DiscoverInternalState> =
  createSelectorHook(internalStateContext);

export const useDataViewsForPicker = () => {
  const originalAdHocDataViews = useAdHocDataViews();
  const savedDataViews = useInternalStateSelector((state) => state.savedDataViews);
  const defaultProfileAdHocDataViewIds = useInternalStateSelector(
    (state) => state.defaultProfileAdHocDataViewIds
  );

  return useMemo(() => {
    const managedDataViews = originalAdHocDataViews.filter(
      ({ id }) => id && defaultProfileAdHocDataViewIds.includes(id)
    );
    const adHocDataViews = differenceBy(originalAdHocDataViews, managedDataViews, 'id');

    return { savedDataViews, managedDataViews, adHocDataViews };
  }, [defaultProfileAdHocDataViewIds, originalAdHocDataViews, savedDataViews]);
};
