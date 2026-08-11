/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { InternalStepsEditorHandlers } from './internal_steps/editor_handlers/editor_handlers';
import type { WorkflowsContext } from './types';
import { useKibana } from '../../hooks/use_kibana';

const WorkflowsContext = React.createContext<WorkflowsContext | undefined>(undefined);

export const WorkflowsContextProvider = React.memo<React.PropsWithChildren>(({ children }) => {
  const { services } = useKibana();

  const value = useMemo<WorkflowsContext>(
    () => ({
      internalStepsEditorHandlers: new InternalStepsEditorHandlers(services),
    }),
    [services]
  );

  return <WorkflowsContext.Provider value={value}>{children}</WorkflowsContext.Provider>;
});
WorkflowsContextProvider.displayName = 'WorkflowsContextProvider';

export const useWorkflowsContext = () => {
  const context = React.useContext(WorkflowsContext);
  if (!context) {
    throw new Error('WorkflowsContextProvider not found');
  }
  return context;
};
