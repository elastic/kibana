/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext } from 'react';
import { Provider } from 'react-redux';

import type { WorkspaceTool } from '@kbn/core-chrome-browser';

import { store } from './store';

export interface WorkspaceProviderProps {
  children: React.ReactNode;
  tools: WorkspaceTool[];
}

interface WorkspaceContext {
  tools: WorkspaceTool[];
}

export const WorkspaceContext = createContext<WorkspaceContext>({ tools: [] });

export const WorkspaceProvider = ({ children, tools }: WorkspaceProviderProps) => {
  return (
    <WorkspaceContext.Provider value={{ tools }}>
      <Provider store={store}>{children}</Provider>
    </WorkspaceContext.Provider>
  );
};

export const useWorkspaceContext = () => React.useContext(WorkspaceContext);
