/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import React, { type PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject, skip } from 'rxjs';

export interface DiscoverRuntimeState {
  currentDataView: DataView;
}

export type RuntimeStateManager = {
  [key in keyof DiscoverRuntimeState as `${key}$`]: BehaviorSubject<
    DiscoverRuntimeState[key] | undefined
  >;
};

export const createRuntimeStateManager = (): RuntimeStateManager => ({
  currentDataView$: new BehaviorSubject<DataView | undefined>(undefined),
});

export const useRuntimeState = <T,>(stateSubject$: BehaviorSubject<T>) => {
  const [stateObservable$] = useState(() => stateSubject$.pipe(skip(1)));
  return useObservable(stateObservable$, stateSubject$.getValue());
};

const runtimeStateContext = createContext<DiscoverRuntimeState | undefined>(undefined);

export const RuntimeStateProvider = ({
  currentDataView,
  children,
}: PropsWithChildren<DiscoverRuntimeState>) => {
  const runtimeState = useMemo<DiscoverRuntimeState>(
    () => ({ currentDataView }),
    [currentDataView]
  );

  return (
    <runtimeStateContext.Provider value={runtimeState}>{children}</runtimeStateContext.Provider>
  );
};

const useRuntimeStateContext = () => {
  const context = useContext(runtimeStateContext);

  if (!context) {
    throw new Error('useRuntimeState must be used within a RuntimeStateProvider');
  }

  return context;
};

export const useCurrentDataView = () => useRuntimeStateContext().currentDataView;
