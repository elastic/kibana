/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { createContext, useContext, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { skip, type BehaviorSubject } from 'rxjs';

export interface DiscoverRuntimeState {
  currentDataView$: BehaviorSubject<DataView>;
}

const runtimeStateContext = createContext<DiscoverRuntimeState | undefined>(undefined);

export const RuntimeStateProvider = runtimeStateContext.Provider;

const useRuntimeState = () => {
  const context = useContext(runtimeStateContext);

  if (!context) {
    throw new Error('useRuntimeState must be used within a RuntimeStateProvider');
  }

  return context;
};

export const useCurrentDataView = () => {
  const { currentDataView$ } = useRuntimeState();
  const [dataView$] = useState(() => currentDataView$.pipe(skip(1)));

  return useObservable(dataView$, currentDataView$.getValue());
};
