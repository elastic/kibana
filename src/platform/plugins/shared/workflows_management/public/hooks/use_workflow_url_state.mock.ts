/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useState } from 'react';

type MockActiveTab = 'workflow' | 'executions';

export const useWorkflowUrlState = () => {
  const [activeTab, setActiveTabState] = useState<MockActiveTab>('workflow');
  const setActiveTab = useCallback((tab: MockActiveTab) => {
    setActiveTabState(tab);
  }, []);
  return {
    activeTab,
    editorView: 'yaml' as const,
    graphDirection: 'TB' as const,
    selectedExecutionId: undefined,
    selectedStepExecutionId: undefined,
    selectedStepId: undefined,
    shouldAutoResume: false,
    setActiveTab,
    setEditorView: () => {},
    setGraphDirection: () => {},
    setSelectedExecution: () => {},
    setSelectedStepExecution: () => {},
    setSelectedStep: () => {},
    updateUrlState: () => {},
    clearResumeParam: () => {},
  };
};
