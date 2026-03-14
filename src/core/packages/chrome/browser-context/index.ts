/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode, useContext, createContext } from 'react';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal-types';

interface ChromeContextValue {
  chrome: InternalChromeStart;
}

const ChromeContext = createContext<ChromeContextValue | null>(null);

export interface ChromeServiceProviderProps {
  children: ReactNode;
  value: ChromeContextValue;
}

export function ChromeServiceProvider({ children, value }: ChromeServiceProviderProps) {
  return React.createElement(ChromeContext.Provider, { value }, children);
}

function useChromeContext(): ChromeContextValue {
  const context = useContext(ChromeContext);
  if (!context) {
    throw new Error('useChromeService must be used within a ChromeServiceProvider');
  }
  return context;
}

export function useChromeService(): InternalChromeStart {
  return useChromeContext().chrome;
}
