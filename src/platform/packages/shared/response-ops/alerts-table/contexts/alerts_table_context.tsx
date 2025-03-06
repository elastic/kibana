/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { PropsWithChildren, createContext, useContext } from 'react';
import { typedMemo } from '../utils/react';
import { AdditionalContext, RenderContext } from '../types';

const AlertsTableContext = createContext({});

export const AlertsTableContextProvider = typedMemo(
  <AC extends AdditionalContext = AdditionalContext>({
    children,
    value,
  }: PropsWithChildren<{
    value: RenderContext<AC>;
  }>) => {
    return <AlertsTableContext.Provider value={value}>{children}</AlertsTableContext.Provider>;
  }
);

export const useAlertsTableContext = <AC extends AdditionalContext = AdditionalContext>() => {
  return useContext(AlertsTableContext) as RenderContext<AC>;
};
