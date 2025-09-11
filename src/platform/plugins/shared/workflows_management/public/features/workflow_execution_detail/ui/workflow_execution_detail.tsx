/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { ExecutionDetail } from './execution_detail';

export interface WorkflowExecutionProps {
  workflowExecutionId: string;
  workflowYaml: string;
  fields?: Array<keyof EsWorkflowStepExecution>;
  onClose?: () => void;
}

export const WorkflowExecutionDetail: React.FC<WorkflowExecutionProps> = ({
  workflowExecutionId,
  workflowYaml,
  onClose,
}) => {
  const { setSelectedStepExecution, selectedStepExecutionId, setSelectedStep } =
    useWorkflowUrlState();
  return (
    <ExecutionDetail
      workflowExecutionId={workflowExecutionId}
      workflowYaml={workflowYaml}
      selectedStepExecutionId={selectedStepExecutionId}
      setSelectedStep={setSelectedStep}
      setSelectedStepExecution={setSelectedStepExecution}
      onClose={onClose}
    />
  );
};
