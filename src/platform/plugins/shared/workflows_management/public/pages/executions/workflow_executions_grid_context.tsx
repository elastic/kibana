/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext } from 'react';
import type { UseWorkflowExecutionsGridSelectionResult } from './use_workflow_executions_grid_selection';

const WorkflowExecutionsGridContext = createContext<
  UseWorkflowExecutionsGridSelectionResult | undefined
>(undefined);

export const WorkflowExecutionsGridProvider = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: UseWorkflowExecutionsGridSelectionResult;
}) => (
  <WorkflowExecutionsGridContext.Provider value={value}>
    {children}
  </WorkflowExecutionsGridContext.Provider>
);

export const useWorkflowExecutionsGridContext = (): UseWorkflowExecutionsGridSelectionResult => {
  const context = useContext(WorkflowExecutionsGridContext);

  if (!context) {
    throw new Error(
      'useWorkflowExecutionsGridContext must be used within WorkflowExecutionsGridProvider'
    );
  }

  return context;
};
