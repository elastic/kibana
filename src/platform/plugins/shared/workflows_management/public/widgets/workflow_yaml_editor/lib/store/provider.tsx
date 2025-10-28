/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { Provider } from 'react-redux';
import { createWorkflowEditorStore } from './store';

interface WorkflowEditorStoreProviderProps {
  children: React.ReactNode;
}

/**
 * Provides a workflow editor Redux store context to child components.
 * Creates a new store instance for each provider instance, ensuring isolation.
 */
export function WorkflowEditorStoreProvider({ children }: WorkflowEditorStoreProviderProps) {
  const workflowEditorStore = useMemo(() => createWorkflowEditorStore(), []);

  return <Provider store={workflowEditorStore}>{children}</Provider>;
}
