/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { ExecutionDetail } from './execution_detail';

export interface SingleStepExecution {
  stepExecutionId: string;
  workflowYaml: string;
  onClose: () => void;
}

export const SingleStepExecution: React.FC<SingleStepExecution> = ({
  stepExecutionId: executionId,
  workflowYaml,
  onClose,
}) => {
  const [selectedStepExecutionId, setSelectedStepExecutionId] = useState<string | undefined>(
    undefined
  );

  const setSelectedStepExecution = useCallback((stepId: string | null) => {
    setSelectedStepExecutionId(stepId || undefined);
  }, []);

  return (
    <ExecutionDetail
      workflowExecutionId={executionId}
      workflowYaml={workflowYaml}
      selectedStepExecutionId={selectedStepExecutionId}
      setSelectedStep={() => {}}
      setSelectedStepExecution={setSelectedStepExecution}
      onClose={onClose}
    />
  );
};
