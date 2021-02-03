/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { createContext, useContext } from 'react';
import { PanelRegistry } from './registry';

const PanelContext = createContext({ registry: new PanelRegistry() });

interface ContextProps {
  children: any;
  registry: PanelRegistry;
}

export function PanelContextProvider({ children, registry }: ContextProps) {
  return <PanelContext.Provider value={{ registry }}>{children}</PanelContext.Provider>;
}

export const usePanelContext = () => {
  const context = useContext(PanelContext);
  if (context === undefined) {
    throw new Error('usePanelContext must be used within a <PanelContextProvider />');
  }
  return context;
};
