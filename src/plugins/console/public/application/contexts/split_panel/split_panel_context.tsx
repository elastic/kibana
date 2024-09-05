/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext } from 'react';
import { PanelRegistry } from './split_panel_registry';

const PanelContext = createContext({ registry: new PanelRegistry() });

interface ContextProps {
  children: JSX.Element;
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
